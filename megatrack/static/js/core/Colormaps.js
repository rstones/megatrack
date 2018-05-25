var mgtrk = mgtrk || {};

mgtrk.Colormaps = (function() {
    const Colormaps = {};
    
    Colormaps.init = () => {
        
        const initColormapMax = 1.0;
        const initColormapMin = 0.25;
        const initColormapOpacity = 1.0;
        
        const colormaps = {};
        
        const checkColormapMinMax = function(min, max) {
            if (min < 0.01) { // cutoff for nifti density maps
                min = 0.01;
            } else if (min < 0 || min > 1 || max < 0 || max > 1 || min > max) {
                throw TypeError("Invalid min/max values passed to colormap function");
            }
            return {"min":min, "max":max};
        };
    
        /*
         * @param min Minimum probability cutoff for density map
         * @param max Value above which probability saturates
         * @param alpha opacity of the colormap
         */
        const redColormap = function(min, max, alpha) {
            var minMax = checkColormapMinMax(min, max);
            min = minMax.min; max = minMax.max;
            var numSegments = 5;
            var segmentLength = (max - min) / numSegments;
            var colormap = [{"index":0, "rgb":[0,0,0,0]}, {"index":min-0.0001, "rgb":[0,0,0,0]}];
            for (var i=0; i<numSegments+1; i++) {
                var r = 160+(i*95/numSegments);
                var g = (i*100/numSegments);
                var b = 0;
                colormap.push({"index": min+(i*segmentLength), "rgb":[r,g,b,alpha]});
            }
            colormap.push({"index": 1, "rgb": [255,180,0,alpha]});
            return colormap;
        };
    
        const blueColormap = function(min, max, alpha) {
            var minMax = checkColormapMinMax(min, max);
            min = minMax.min; max = minMax.max;
            var numSegments = 5;
            var segmentLength = (max - min) / numSegments;
            var colormap = [{"index":0, "rgb":[0,0,0,0]}, {"index":min-0.0001, "rgb":[0,0,0,0]}];
            for (var i=0; i<numSegments+1; i++) {
                var r = 0;
                var g = (i*200/numSegments);
                var b = 160+(i*95/numSegments);
                colormap.push({"index": min+(i*segmentLength), "rgb":[r,g,b,alpha]});
            }
            colormap.push({"index": 1, "rgb": [0,200,255,alpha]});
            return colormap;
        };
    
        const greenColormap = function(min, max, alpha) {
            var minMax = checkColormapMinMax(min, max);
            min = minMax.min; max = minMax.max;
            var numSegments = 5;
            var segmentLength = (max - min) / numSegments;
            var colormap = [{"index":0, "rgb":[0,0,0,0]}, {"index":min-0.0001, "rgb":[0,0,0,0]}];
            for (var i=0; i<numSegments+1; i++) {
                var r = 0;
                var g = 120+(i*135/numSegments);
                var b = (i*180/numSegments);
                colormap.push({"index": min+(i*segmentLength), "rgb":[r,g,b,alpha]});
            }
            colormap.push({"index": 1, "rgb": [180,255,180,alpha]});
            return colormap;
        };
    
        const purpleColormap = function(min, max, alpha) {
            var minMax = checkColormapMinMax(min, max);
            min = minMax.min; max = minMax.max;
            var numSegments = 5;
            var segmentLength = (max - min) / numSegments;
            var colormap = [{"index":0, "rgb":[0,0,0,0]}, {"index":min-0.0001, "rgb":[0,0,0,0]}];
            for (var i=0; i<numSegments+1; i++) {
                var r = 120+(i*135/numSegments);
                var g = 0;
                var b = 120+(i*135/numSegments);
                colormap.push({"index": min+(i*segmentLength), "rgb":[r,g,b,alpha]});
            }
            colormap.push({"index": 1, "rgb": [255,180,255,alpha]});
            return colormap;
        };
    
        const yellowColormap = function(min, max, alpha) {
            var minMax = checkColormapMinMax(min, max);
            min = minMax.min; max = minMax.max;
            var numSegments = 5;
            var segmentLength = (max - min) / numSegments;
            var colormap = [{"index":0, "rgb":[0,0,0,0]}, {"index":min-0.0001, "rgb":[0,0,0,0]}];
            for (var i=0; i<numSegments+1; i++) {
                var r = 150+(i*105/numSegments);
                var g = 150+(i*105/numSegments);
                var b = 0;
                colormap.push({"index": min+(i*segmentLength), "rgb":[r,g,b,alpha]});
            }
            colormap.push({"index": 1, "rgb": [255,255,180,alpha]});
            return colormap;
        };
        
        const lesionColormap = function(min, max, alpha) {
            //alpha = 0.6;
            var minMax = checkColormapMinMax(min, max);
            min = minMax.min; max = minMax.max;
            var numSegments = 5;
            var segmentLength = (max - min) / numSegments;
            var colormap = [{"index":0, "rgb":[0,0,0,0]}, {"index":min-0.0001, "rgb":[0,0,0,0]}];
            for (var i=0; i<numSegments+1; i++) {
                var r = Math.round(150+(i*54/numSegments));
                var g = Math.round(100+(i*53/numSegments));
                var b = 0;
                colormap.push({"index": min+(i*segmentLength), "rgb":[r,g,b,alpha]});
            }
            colormap.push({"index": 1, "rgb": [204,153,0,alpha]});
            return colormap;
        };
        
        /**
         * Define a css class in the html header for lesion colormap.
         * @param {Boolean} fade    If true will include an opacity gradient. 
         */
        const createLesionColormapClass = function(fade) {
            // generate css class for lesion colormap gradient
            const colormap = lesionColormap(initColormapMin, initColormapMax, initColormapOpacity);
            const rgbaColors = [];
            const n = 8;
            let fadeCount = 0;
            const fadeGap = 0.25;
            for (let i=3; i<n-1; i++) {
                const color = colormap[i].rgb;
                rgbaColors.push('rgba('+color[0]+','+color[1]+','+color[2]+','+(fade ? fadeCount++*fadeGap : color[3])+')');
            }
            $('head').append('<style>'
                                    +'.lesion-colormap {'
                                    +'background:-moz-linear-gradient(left, '+rgbaColors[0]+','+rgbaColors[1]+','+rgbaColors[2]+','+rgbaColors[3]+');'
                                    +'background:-webkit-linear-gradient(left, '+rgbaColors[0]+','+rgbaColors[1]+','+rgbaColors[2]+','+rgbaColors[3]+');'
                                    +'}'
                                    +'</style>');
        };
    
        const colormapFunctions = {
            "yellow": yellowColormap,
            "purple": purpleColormap,
            "green": greenColormap,
            "blue": blueColormap,
            "red": redColormap
        };
        
        const generateXTKColormap = function(colormap) {
            var cmapShades = 100;
            // Colormaps is also the global variable for the external library used to generate the colormaps
            var cmap = window.Colormaps({
                colormap: colormap,
                alpha: [0,1],
                nshades: cmapShades,
                format: 'rgbaString'
            });
            return function(normpixval) {
                var rgbaString = cmap[Math.floor((cmap.length-1)*normpixval)];
                rgbaString = rgbaString.replace(/[^\d,.]/g, '').split(',');
                var rgba = [];
                for (let i = 0; i<3; i++) rgba.push(parseInt(rgbaString[i], 10));
                rgba.push(255*parseFloat(rgbaString[3]));
                return rgba;
            };
        };
        
        // init stuff
        const keys = Object.keys(colormapFunctions);
        let idx = keys.length;
        while (idx--) {
            const key = keys[idx];
            colormaps[key] = colormapFunctions[key](initColormapMin, initColormapMax, 1);
            // insert colormap css classes
            const rgbaColors = [];
            const n = 8;
            for (let i=3; i<n-1; i++) {
                const color = colormaps[key][i].rgb;
                rgbaColors.push('rgba('+color[0]+','+color[1]+','+color[2]+','+color[3]+')');
            }
            // USE ES6 TEMPLATES AND MULTILINE STRINGS HERE
            $('head').append('<style>'
                                +'.'+key+'-colormap {'
                                +'background:-moz-linear-gradient(left, '+rgbaColors[0]+','+rgbaColors[1]+','+rgbaColors[2]+','+rgbaColors[3]+');'
                                +'background:-webkit-linear-gradient(left, '+rgbaColors[0]+','+rgbaColors[1]+','+rgbaColors[2]+','+rgbaColors[3]+');'
                                +'}'
                                +'</style>');
        }
        
        const numColormaps = Object.keys(colormaps).length;
    
        return {
                colormaps: {
                                initColormapMax: initColormapMax,
                                initColormapMin: initColormapMin,
                                initColormapOpacity: initColormapOpacity,
                            
                                colormaps: colormaps,
                                numColormaps: numColormaps,
                                colormapFunctions: colormapFunctions,
                                generateXTKColormap: generateXTKColormap,
                                lesionColormap: lesionColormap,
                                createLesionColormapClass: createLesionColormapClass
                            }
                };
    };
    
    return Colormaps;
})();
