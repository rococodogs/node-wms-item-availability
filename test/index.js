var test = require('tape')
var xml = require('fs').readFileSync(__dirname + '/response.xml')
var Avail = require('../')
var parse = require('../parse-xml-body')

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

test('Error is thrown if no WSKey or auth. inst. id is passed', function (t) {
  t.plan(2)

  t.throws(function () {
    Avail()
  })

  t.throws(function () {
    new Avail({})
  })
})
