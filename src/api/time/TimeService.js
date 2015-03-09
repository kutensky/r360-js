r360.TimeService = {

    cache : {},

    getRouteTime : function(travelOptions, successCallback, errorCallback) {

        // hide the please wait control
        if ( travelOptions.getWaitControl() ) travelOptions.getWaitControl().show();

        var cfg = { 
            sources : [], targets : [],
            pathSerializer : travelOptions.getPathSerializer(), 
            maxRoutingTime : travelOptions.getMaxRoutingTime()
        };

        // configure sources
        _.each(travelOptions.getSources(), function(source){

            // set the basic information for this source
            var src = {
                lat : _.has(source, 'lat') ? source.lat : source.getLatLng().lat,
                lng : _.has(source, 'lon') ? source.lon : _.has(source, 'lng') ? source.lng : source.getLatLng().lng,
                id  : _.has(source, 'id')  ? source.id  : '',
                tm  : {}
            };

            var travelType = _.has(source, 'travelType') ? source.travelType : travelOptions.getTravelType();

            // this enables car routing
            src.tm[travelType] = {};

            // set special routing parameters depending on the travel type
            if ( travelType == 'transit' ) {
                
                src.tm.transit.frame = {};
                if ( !_.isUndefined(travelOptions.getTime()) ) src.tm.transit.frame.time = travelOptions.getTime();
                if ( !_.isUndefined(travelOptions.getDate()) ) src.tm.transit.frame.date = travelOptions.getDate();
            }
            if ( travelType == 'ebike' ) {
                
                src.tm.ebike = {};
                if ( !_.isUndefined(travelOptions.getBikeSpeed()) )     src.tm.ebike.speed    = travelOptions.getBikeSpeed();
                if ( !_.isUndefined(travelOptions.getBikeUphill()) )    src.tm.ebike.uphill   = travelOptions.getBikeUphill();
                if ( !_.isUndefined(travelOptions.getBikeDownhill()) )  src.tm.ebike.downhill = travelOptions.getBikeDownhill();
            }
            if ( travelType == 'rentbike' ) {
                
                src.tm.rentbike = {};
                if ( !_.isUndefined(travelOptions.getBikeSpeed()) )     src.tm.rentbike.bikespeed    = travelOptions.getBikeSpeed();
                if ( !_.isUndefined(travelOptions.getBikeUphill()) )    src.tm.rentbike.bikeuphill   = travelOptions.getBikeUphill();
                if ( !_.isUndefined(travelOptions.getBikeDownhill()) )  src.tm.rentbike.bikedownhill = travelOptions.getBikeDownhill();
                if ( !_.isUndefined(travelOptions.getWalkSpeed()) )     src.tm.rentbike.walkspeed    = travelOptions.getWalkSpeed();
                if ( !_.isUndefined(travelOptions.getWalkUphill()) )    src.tm.rentbike.walkuphill   = travelOptions.getWalkUphill();
                if ( !_.isUndefined(travelOptions.getWalkDownhill()) )  src.tm.rentbike.walkdownhill = travelOptions.getWalkDownhill();
            }
            if ( travelType == 'rentandreturnbike' ) {
                
                src.tm.rentandreturnbike = {};
                if ( !_.isUndefined(travelOptions.getBikeSpeed()) )     src.tm.rentandreturnbike.bikespeed    = travelOptions.getBikeSpeed();
                if ( !_.isUndefined(travelOptions.getBikeUphill()) )    src.tm.rentandreturnbike.bikeuphill   = travelOptions.getBikeUphill();
                if ( !_.isUndefined(travelOptions.getBikeDownhill()) )  src.tm.rentandreturnbike.bikedownhill = travelOptions.getBikeDownhill();
                if ( !_.isUndefined(travelOptions.getWalkSpeed()) )     src.tm.rentandreturnbike.walkspeed    = travelOptions.getWalkSpeed();
                if ( !_.isUndefined(travelOptions.getWalkUphill()) )    src.tm.rentandreturnbike.walkuphill   = travelOptions.getWalkUphill();
                if ( !_.isUndefined(travelOptions.getWalkDownhill()) )  src.tm.rentandreturnbike.walkdownhill = travelOptions.getWalkDownhill();
            }
            if ( travelType == 'bike' ) {
                
                src.tm.bike = {};
                if ( !_.isUndefined(travelOptions.getBikeSpeed()) )     src.tm.bike.speed    = travelOptions.getBikeSpeed();
                if ( !_.isUndefined(travelOptions.getBikeUphill()) )    src.tm.bike.uphill   = travelOptions.getBikeUphill();
                if ( !_.isUndefined(travelOptions.getBikeDownhill()) )  src.tm.bike.downhill = travelOptions.getBikeDownhill();
            }
            if ( travelType == 'walk') {
                
                src.tm.walk = {};
                if ( !_.isUndefined(travelOptions.getWalkSpeed()) )     src.tm.walk.speed    = travelOptions.getWalkSpeed();
                if ( !_.isUndefined(travelOptions.getWalkUphill()) )    src.tm.walk.uphill   = travelOptions.getWalkUphill();
                if ( !_.isUndefined(travelOptions.getWalkDownhill()) )  src.tm.walk.downhill = travelOptions.getWalkDownhill();
            }
            
            // add to list of sources
            cfg.sources.push(src);
        });
        
        // configure targets for routing
        _.each(travelOptions.getTargets(), function(target){

            cfg.targets.push({

                lat : _.has(target, 'lat') ? target.lat : target.getLatLng().lat,
                lng : _.has(target, 'lon') ? target.lon : _.has(target, 'lng') ? target.lng : target.getLatLng().lng,
                id  : _.has(target, 'id')  ? target.id  : '',
            });
        });

        if ( !_.has(r360.TimeService.cache, JSON.stringify(cfg)) ) {

            // execute routing time service and call callback with results
            $.ajax({
                url:         r360.config.serviceUrl + r360.config.serviceVersion + '/time?key=' +r360.config.serviceKey,
                type:        "POST",
                data:        JSON.stringify(cfg) ,
                contentType: "application/json",
                dataType:    "json",
                success: function (result) {

                    // hide the please wait control
                    if ( travelOptions.getWaitControl() ) travelOptions.getWaitControl().hide();

                    // the new version is an object, old one an array
                    if ( _.has(result, 'data')  ) {

                        if ( result.code == 'ok' ) {

                            // cache the result
                            r360.TimeService.cache[JSON.stringify(cfg)] = result.data;
                            // call successCallback with returned results
                            successCallback(result.data);
                        }
                        else 
                            // check if the error callback is defined
                            if ( _.isFunction(errorCallback) )
                                errorCallback(result.code, result.message);
                    }
                    // fallback for old clients
                    else {

                        // cache the result
                        r360.TimeService.cache[JSON.stringify(cfg)] = result;
                        // call successCallback with returned results
                        successCallback(result);
                    }
                },
                // this only happens if the service is not available, all other errors have to be transmitted in the response
                error: function(data){ 

                    // hide the please wait control
                    if ( travelOptions.getWaitControl() ) travelOptions.getWaitControl().hide();
                    // call error callback if defined
                    if ( _.isFunction(errorCallback) )
                        errorCallback("service-not-available", "The time service is currently not available, please try again later."); 
                }
            });
        }
        else { 

            // hide the please wait control
            if ( travelOptions.getWaitControl() ) travelOptions.getWaitControl().hide();
            // call callback with returned results
            successCallback(r360.TimeService.cache[JSON.stringify(cfg)]); 
        }
    }
};