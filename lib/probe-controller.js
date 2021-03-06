
var _ = require('lodash');

var kafka = require('kafka-node'),
    HighLevelProducer = kafka.HighLevelProducer,
    client = new kafka.Client('10.100.0.4:2181'),
    producer = new HighLevelProducer(client);

var ProbeData = require('./probe-data');

function ProbeController() {
    this.probes = {};
    setInterval(getProbeInfo, 1000 * 10);
}

/**
 * Add a new probe callback
 *
 * @param {String} name
 * @param {Function} callback
 * @returns {ProbeController}
 */
ProbeController.prototype.add = function(name, callback) {
    console.log('Adding probe ' + name);
    this.probes[name] = callback;
    return this;
}

/**
 * Remove the callback with the given name from the probes
 *
 * @param {String} name
 */
ProbeController.prototype.remove = function(name) {
    console.log('Removing probe ' + name);
    delete this.probes.name;
}

function getProbeInfo() {

    // aggregate probe data
    var probeEvent = {};
    probeEvent.cluster = 'nodejs-testcluster';
    probeEvent.node = 'NodeJS-Machine';
    probeEvent.httpPort = '8181';
    probeEvent.timeStamp = (new Date()).getTime();
    probeEvent.data = [];

    var probeData = _.mapValues(probeController.probes, function(callback) {
        return  callback();
    });

    _.forEach(probeData, function(data) {
        probeEvent.data.push(data);
    });

    var healthcheckData = _.filter(probeEvent.data, function(data) {
        return data.healthy !== undefined;
    });

    var unhealthyData = _.filter(healthcheckData, function(data) {
        return !data.healthy;
    });

    probeEvent.healthy = unhealthyData.length == 0;

    console.log('Sending probe event to kafka ' + JSON.stringify(probeEvent));

    // send it to the kafka backend
    var payloads = [{
        topic: 'amdatu.rti.healthcheck',
        messages: JSON.stringify(probeEvent)
    }];

    producer.send(payloads, function(err, data) {
        if(err) {
            console.log('Error while sending probe data to kafka ' + err);
        }
    });
}

producer.on('ready', function() {
    console.log('Probe kafka producer ready');
});

var probeController = module.exports = exports = new ProbeController;
