var test = require('tape')
var xml = require('fs').readFileSync(__dirname + '/response.xml')
var parse = require('../parse-xml-body')

// typeOfRecord
// encodingLevel
// format
// receiptAcqStatus
// generalRetention
// completeness
// dateOfReport
// nucCode
// localLocation
// shelvingLocation
// callNumber
// copyNumber
// _enumAndChron_
// volumes
// _volumes/volume_
// _volumes/volume/enumeration_
// _volumes/volume/chronology_
// _volumes/volume/enumAndChron_
// circulations
// circulations/circulation
// circulations/circulation/availableNow
// _circulations/circulation/availabilityDate_
// circulations/circulation/itemId
// circulations/circulation/renewable
// circulations/circulation/onHold
// _circulations/circulation/onHold/enumAndChron_

var requiredFields = [
  'typeOfRecord',
  'encodingLevel',
  'format',
  'receiptAcqStatus',
  'generalRetention',
  'completeness',
  'dateOfReport',
  'nucCode',
  'localLocation',
  'shelvingLocation',
  'callNumber',
  'copyNumber',
  'volumes',
  'circulations'
]

var requiredCircFields = [
  'availableNow',
  'itemId',
  'renewable',
  'onHold'
]

test('response is parsed + contains the right data', function (t) {
  parse(xml, function (err, holdings) {

    t.notOk(err, 'No error should be returned')
    t.equal(holdings.length, 2, '2 holdings should be parsed')

    for (var i = 0; i < holdings.length; i++) {
      var holding = holdings[i]
      requiredFields.forEach(function (f) {
        t.ok(holding.hasOwnProperty(f), 'holding['+i+'] has required field `' + f + '`')
      })

      for (var c = 0; c < holding.circulations.length; c++) {
        var circulation = holding.circulations[c]
        requiredCircFields.forEach(function (cf) {
          t.ok(
            circulation.hasOwnProperty(cf),
            'holding['+i+'].circulation['+c+'] has required field `'+cf+'`'
          )
        })
      }
    }

    t.end()
  })
})
