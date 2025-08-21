const nodeTypeCounters = {
    function: 1,
    variable: 1,
    system: 1,
    action: 1,
    cast: 1,
    exec: 1
};

export function getNextNodeId(type = 'function') {
    if (!nodeTypeCounters[type]) nodeTypeCounters[type] = 1;
    return `${type}-${nodeTypeCounters[type]++}`;
}
