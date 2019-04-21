const express = require('express');
const router = express.Router();
const { checkSchema, validationResult} = require('express-validator/check');
const geolite2 = require('geolite2');
const maxmind = require('maxmind');
const {Connection} = require('../configs/database');
const {resourceSchema} = require('../schemas/resource');

const matchIpsToLocation = (requestedIp, ipRange, cb)=>{
    maxmind.open(geolite2.paths.city, (err, cityLookup)=>{
        if (err){
            return cb(err);
        }
        let city = cityLookup.get(requestedIp);
        let requestedLocation = city.location.time_zone;
        let ipRangeLocations = [];
        if (ipRange.length>0){
            ipRangeLocations = ipRange.map(ip => {
                let city = cityLookup.get(ip);
                return city.location.time_zone;
            });
        }
        return cb(null, {requestedLocation, ipRangeLocations})
    });
};


router.get('/:name', function(req, res, next) {
    let {name} = req.params;
    let {ip} = req.query;
    if (!ip){
        res.status(400);
        return res.send('Missing required parameter');
    }
    else {
        let isValidIp = maxmind.validate(ip);
        if (!isValidIp){
            res.status(400);
            return res.send('provided ip is not valid');
        }

        let collection = Connection.db.collection('resources');
        collection.findOne({
            name
        }, function(err, result) {
            if (err || !result){
                return res.status(400).json('an error occured or no such resource found');
            }
            else{
                let {location, ipRange, context} = result;
                if(location){
                    matchIpsToLocation(ip, [], (err, locationResult)=>{
                        if (err){
                            return res.status(500).json({message: 'cannot perform ip lookup'});
                        }
                        if (locationResult.requestedLocation === location)
                            return res.status(200).json({context});
                        else {
                            return res.status(403).json({error: 'not allowed to access specific resource'})
                        }
                    });
                }
                else{
                    matchIpsToLocation(ip, ipRange, (err, locationResult)=>{
                        if (err){
                            return res.status(500).json({message: 'cannot perform ip lookup'});
                        }
                        let {ipRangeLocations, requestedLocation} = locationResult;
                        let isResourceLocationMatched = ipRangeLocations.some(resourceLocation=> resourceLocation === requestedLocation);

                        if (isResourceLocationMatched){
                            return res.status(200).json({context});
                        }
                        else{
                            return res.status(403).json({error: 'not allowed to access specific resource'});
                        }
                    });
                }
            }
        });
    }

});

router.post('/', checkSchema(resourceSchema), function(req, res, next) {
    const {ipRange, location, name, context} = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    if (!ipRange && !location){
        return res.status(403).json({errors: 'ipRange or location not specified'})
    }
    else {
        let collection = Connection.db.collection('resources');
        collection.insertOne({
            name,
            context,
            ipRange,
            location
        }, function(err, result) {
            if (err){
                if (err.code === 11000){
                    return res.status(409).json('resource with such name already exists');
                }
                else {
                    return res.status(400).json('cannot create a resource');
                }
            }
            return res.status(201).send('resource successfully created');
        });
    }
});

module.exports = router;