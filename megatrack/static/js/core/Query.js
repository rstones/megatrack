var mgtrk = mgtrk || {};

/**
 *  Collection of util functions to validate and reliably stringify query objects 
 */
mgtrk.Query = (function() {
    
    const Query = {};
    
    Query.validate = (query) => {
    
        const datasetKeys = Object.keys(query);
        if (datasetKeys.length !== 1) {
            return false;
        }
        
        const datasetKey = datasetKeys[0];
        
        const methodCode = query[datasetKey].method;
        if (typeof methodCode === 'undefined') {
            return false;
        }
        
        const constraints = query[datasetKey].constraints;
        if (typeof constraints === 'undefined') {
            return false;
        }
        
        const constraintKeys = Object.keys(constraints);
        if (!constraintKeys.length) {
            return false; // we may want a situation where no constraints are passed though?
        }
        
        for (let i = 0; i < constraintKeys.length; i++) {
            const key = constraintKeys[i];
            const constraint = constraints[key];
            const type = constraint.type;
            
            if (typeof type === 'undefined') {
                return false;
            }
            
            switch (type) {
                case 'range':
                    const min = constraint.min;
                    const max = constraint.max;
                    
                    if (typeof min === 'undefined' || typeof max === 'undefined') {
                        return false;
                    }
                    
                    break;
                    
                case 'checkbox':
                    const vals = constraint.vals;
                    
                    if (typeof vals === 'undefined') {
                        return false;
                    }
                
                    break;
                    
                case 'radio':
                    const val = constraint.val;
                    
                    if (typeof val === 'undefined') {
                        return false;
                    }
                
                    break;
                    
                default:
                    return false;
            }

        }
        
        return true;
        
    };
    
    Query.stringify = (query) => {
        const isValid = Query.validate(query);
        
        if (isValid) {
            // stringify after deep ordering of keys
            
            const datasetCode = Object.keys(query)[0];
            const methodCode = query[datasetCode].method;
            
            const constraintKeys = Object.keys(query[datasetCode].constraints);
            const sortedKeys = constraintKeys.sort();
            
            const constraints = [];
            for (let i = 0; i < sortedKeys.length; i++) {
                
                const key = sortedKeys[i];
                
                const constraint = query[datasetCode].constraints[key];
                
                const keys = Object.keys(constraint).sort();
                
                const constraintProps = [];
                for (let j = 0; j < keys.length; j++) {
                    let value = constraint[keys[j]];
                    if (value instanceof Array) {
                        value = `[${value.sort()}]`;
                    }
                    constraintProps.push(`${keys[j]}-${value}`);
                }
                
                constraints.push(`${key}-\{${constraintProps.join(',')}\}`);
            }
            
            return `\{${datasetCode}-\{constraints-\{${constraints.join(',')}\},method-${methodCode}\}\}`;
            
        } else {
            return false;
        }
    };
    
    return Query;
    
})();