/*
 *
 */
r360.LeafletPolygonLayer = L.Class.extend({
   
    /**
      * This methods initializes the polygon layer's stroke width and polygon opacity.
      * It uses the default values, and in case the options contain other values, the
      * default values are overwritten. 
      *
      * @method send
      * 
      * @param {Object} [options] The typical JS options array.
      * @param {Number} [options.opacity] Defines the opacity of the polygons. 
      *     Higher values mean that the polygon is less opaque.
      * @param {Number} [options.strokeWidth] Defines the strokewidth of the polygons boundaries.
      *     Since we have degenerated polygons (they can have no area), the stroke width defines the
      *     thickness of a polygon. Thicker polygons are not as informative as thinner ones.
      */
    initialize: function (options) {
        
        this.multiPolygons = []; 
        // set default parameters
        this.opacity           = r360.config.defaultPolygonLayerOptions.opacity;
        this.strokeWidth       = r360.config.defaultPolygonLayerOptions.strokeWidth;
        this.tolerance         = r360.config.defaultPolygonLayerOptions.tolerance;
        this.extendWidthX      = r360.config.defaultPolygonLayerOptions.strokeWidth / 2;
        this.extendWidthY      = r360.config.defaultPolygonLayerOptions.strokeWidth / 2;
        this.backgroundColor   = r360.config.defaultPolygonLayerOptions.backgroundColor,
        this.backgroundOpacity = r360.config.defaultPolygonLayerOptions.backgroundOpacity,
        this.topRight          = new r360.Point(-20026377, -20048967);
        this.bottomLeft        = new r360.Point(+20026377, +20048967);

        // overwrite defaults with optional parameters
        if ( typeof options != 'undefined' ) {

            if ( typeof options.opacity        != 'undefined') this.opacity      = options.opacity;
            if ( typeof options.strokeWidth    != 'undefined') this.strokeWidth  = options.strokeWidth;
            if ( typeof options.inverse        != 'undefined') this.inverse      = options.inverse;
            if ( typeof options.tolerance      != 'undefined') this.tolerance    = options.tolerance;
            if ( typeof options.extendWidthX   != 'undefined') this.extendWidthX = options.extendWidthX;
            if ( typeof options.extendWidthY   != 'undefined') this.extendWidthY = options.extendWidthY;
        }
    },

    /**
     * [setInverse Sets this layer to the inverse representation, meaning only reachable parts are displayed
     *     and the rest is greyed out.]
     * @param {[type]} inverse [true or false]
     */
    setInverse: function(inverse){
        this.inverse = inverse;
    },

    /**
     * @return {[type]} [returns the current state of this layer]
     */
    getInverse: function(){
        return this.inverse;
    },

    /**
     * [getBoundingBox returns a leaflet boundingbox from the left bottom to the top right of this layer]
     * @return {[type]} [description]
     */
    getBoundingBox : function(){

        var bl = r360.Util.leafletToWebMercator({ x : this.bottomLeft.x, y : this.bottomLeft.y });
        var tr = r360.Util.leafletToWebMercator({ x : this.topRight.x,   y : this.topRight.y });

        bl = r360.Util.webMercatorToLatLng(bl);
        tr = r360.Util.webMercatorToLatLng(tr);

        var bounds = new L.LatLngBounds(L.latLng(bl.lat, bl.lng), L.latLng(tr.lat, tr.lng));

        return bounds;
    },
    
    /*
     *
     */
    onAdd: function (map) {

        this.map = map;

        // create a DOM element with a unique ID to have multiple maps on one page
        this.element = L.DomUtil.create('div', 'r360-leaflet-polygon-layer-' + $(map._container).attr("id") + ' leaflet-zoom-hide');
        $(this.element).attr("id", "canvas" + $(this.map._container).attr("id"));
        
        // we append the layer to the overlay pane at the last position
        this.map.getPanes().overlayPane.appendChild(this.element);

        // add a view redraw event listener for updating layer's position
        // zoom in/out, panning
        this.map.on('moveend', this.draw, this);

        // repaint layer
        this.draw();
    },

    /**
     * [fitMap adjust the map to fit the complete polygon with maximum zoom level]
     * @return {[type]} [description]
     */
    fitMap: function(){
        this.map.fitBounds(this.getBoundingBox());
    },

    /**
     * [clearAndAddLayers clears the polygons from this layer and adds the new ones. If fitMap is not undefined wesvg
     *     also adjust the map bounds/zoom to show the polygons as big as possible.]
     * @param  {[type]} multiPolygons [description]
     * @return {[type]}                  [description]
     */
    clearAndAddLayers : function(polygons, fitMap){

        this.clearLayers();
        this.addLayer(polygons);

        if ( typeof fitMap !== 'undefined' ) this.fitMap();

        return this;
    },
    
    /**
     * [addLayer description]
     * @param {[type]} multiPolygons [description]
     */
    addLayer : function(multiPolygons) {
        
        this.topRight      = new r360.Point(-20026377, -20048967);
        this.bottomLeft    = new r360.Point(+20026377, +20048967);
        this.multiPolygons = r360.PolygonUtil.prepareMultipolygons(multiPolygons, this.topRight, this.bottomLeft);
        
        // paint them
        this.draw();
    },

    /**
     * [addTo Adds this layer to the given map]
     * @param {[type]} map [the leaflet map on which the layer should be drawn]
     */
    addTo: function (map) {

        map.addLayer(this);
        return this;
    },
    
    /**
     * [onRemove description]
     * @param  {[type]} map [description]
     * @return {[type]}     [description]
     */
    onRemove: function (map) {

        // remove layer's DOM elements and listeners
        map.getPanes().overlayPane.removeChild(this.element);
        map.off('viewreset', this.draw, this);
    },
    
    /**
     * [createSvgData Creates the SVG representation of a given polygon]
     * @param  {[type]} polygon [description]
     * @return {[type]}         [description]
     */
    createSvgData: function(polygon){

        var bounds = r360.PolygonUtil.extendBounds(this.getMapPixelBounds(), this.extendWidthX, this.extendWidthY);
        return r360.SvgUtil.createSvgData(polygon, { 
            bounds      : bounds, 
            scale       : Math.pow(2, this.map._zoom) * 256, 
            tolerance   : this.tolerance, 
            pixelOrigin : this.map.getPixelOrigin(),  
            offset      : this.offset
        });
    },

    /**
     * [getMapPixelBounds description]
     * @return {[type]} [description]
     */
    getMapPixelBounds : function(){

        var bounds = this.map.getPixelBounds();
        return { max : { x : bounds.max.x, y : bounds.max.y }, min : { x : bounds.min.x, y : bounds.min.y } }; 
    },

    /**
     * [clearLayers Remove all child nodes of this layer from the DOM and initializes the layer.]
     */
    clearLayers: function(){        
        
        $('#canvas'+ $(this.map._container).attr("id")).empty();
        this.initialize();
    },

    /*
     *
     */
    draw: function () {

        if ( this.multiPolygons.length > 0 ) {
             
            this.svgWidth  = this.map.getSize().x;
            this.svgHeight = this.map.getSize().y;

            // always place the layer in the top left corner. Later adjustments will be made by svg translate 
            r360.DomUtil.setPosition(this.element, { x : 0 , y : 0 });

            // calculate the offset in between map and svg in order to translate
            var svgPosition    = $('#svg_'+ $(this.map._container).attr("id")).offset();
            var mapPosition    = $(this.map._container).offset();

            if ( typeof this.offset == 'undefined' )
                this.offset = { x : 0 , y : 0 };

            // adjust the offset after map panning / zooming
            if ( typeof svgPosition != 'undefined' ) {
                this.offset.x += (mapPosition.left - svgPosition.left);
                this.offset.y += (mapPosition.top - svgPosition.top);
            }

            // clear layer from previous drawings
            $('#canvas'+ $(this.map._container).attr("id")).empty();

            var gElements = [];  
            
            // go through each multipolygon (represents each travel time)
            for ( var i = 0 ; i < this.multiPolygons.length ;  i++){
                
                var multiPolygon = this.multiPolygons[i], svgData = [];

                // add each polygon for the given travel time
                for ( var j = 0; j < multiPolygon.polygons.length; j++) 
                    svgData.push(this.createSvgData(multiPolygon.polygons[j]));

                if ( svgData.length != 0 ) 
                    gElements.push(r360.SvgUtil.getGElement(svgData, {
                        color             : !this.inverse ? multiPolygon.getColor() : 'black',
                        opacity           : !this.inverse ? 1 : multiPolygon.getOpacity(),
                        strokeWidth       : r360.config.defaultPolygonLayerOptions.strokeWidth
                    })); 
            }

            var options = {
                id                : $(this.map._container).attr("id"),
                offset            : this.offset,
                svgHeight         : this.svgHeight,
                svgWidth          : this.svgWidth,
                backgroundColor   : this.backgroundColor,
                backgroundOpacity : this.backgroundOpacity,
                opacity           : this.opacity,
                strokeWidth       : this.strokeWidth
            }

            // add the svg string to the container
            $('#canvas'+ $(this.map._container).attr("id")).append(!this.inverse ? r360.SvgUtil.getNormalSvgElement(gElements, options) 
                                                                                 : r360.SvgUtil.getInverseSvgElement(gElements, options));
        }
    }
});

r360.leafletPolygonLayer = function (options) {
    return new r360.LeafletPolygonLayer(options);
};