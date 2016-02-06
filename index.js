var https = require('https')
var Parser = require('node-xml').SaxParser
var isEmptyObject = require('is-empty-object')

module.exports = ItemAvailability

function ItemAvailability (wskey, aii) {
  if (!(this instanceof ItemAvailability))
    return new ItemAvailability(wskey, aii)

  var self = this
  this.wskey = wskey
  this.aii = aii || (this.wskey.user ? this.wskey.user.authenticatingInstitutionId : null)

  if (!this.aii)
    throw Error('ItemAvailability requires an authenticatingInstitutionId')
}

ItemAvailability.prototype.query = function (oclcNum, callback) {
  var self = this

  var host = 'worldcat.org'
  var qs = 'x-registryId=' + this.aii + '&query=no%3Aocm' + oclcNum
  var path = '/circ/availability/sru/service?' + qs
  var url = 'https://' + host + path
  var sig = this.wskey.HMACSignature('GET', url)

  var opts = {
    hostname: host,
    path: path,
    headers: {
      'Authorization': sig
    }
  }

  https.request(opts, function (res) {
    var body = ''
    res.setEncoding('utf8')
    res.on('data', function (d) { body += d })
    res.on('end', function () {
      return parseXMLBody(body, callback)
    })
  }).end()
}

function parseXMLBody (body, callback) {
  var holdingCount = 0
  var currentHolding

  // this feels super-longwinded and like it could be significantly slimmed
  // down with some simple refactoring
  var parser = new Parser(function (p) {
    var holdings = []
    var holdingCount = 0
    var currentHolding
    var circCount = 0
    var currentCirc
    var volCount = 0
    var currentVol

    var charBuf = ''

    // flags
    var AT_HOLDINGS = false
    var AT_HOLDING = false

    // holding info
    var AT_NUC_CODE = false
    var AT_SHELVING_LOC = false
    var AT_LOCAL_LOC = false
    var AT_CALL_NUM = false
    var AT_COPY_NUM = false
    var AT_H_ENUM_CHRON = false

    // volume level
    var AT_VOLUMES = false
    var AT_VOLUME = false
    var AT_V_ENUM_CHRON = false

    // circulations level
    var AT_CIRCULATIONS = false
    var AT_CIRCULATION = false

    p.onStartElementNS(function (el, attr) {
      if (el === 'holding' && !AT_HOLDING) {
        AT_HOLDING = true
        currentHolding = holdings[holdingCount++] = {}
        return
      }

      // holding fields
      if (AT_HOLDING) {
        if (el === 'nucCode')
          AT_NUC_CODE = true
        if (el === 'shelvingLocation')
          AT_SHELVING_LOC = true
        if (el === 'localLocation')
          AT_LOCAL_LOC = true
        if (el === 'callNumber')
          AT_CALL_NUM = true
        if (el === 'copyNumber')
          AT_COPY_NUM = true
        if (el === 'enumAndChron')
          AT_H_ENUM_CHRON = true
        if (el === 'shelvingLocation')
          AT_SHELVING_LOC = true
        if (el === 'volumes') {
          AT_VOLUMES = true
          currentHolding.volumes = []
        }
      }

      if (el === 'volume' && AT_VOLUMES && !AT_VOLUME) {
        AT_VOLUME = true
        currentVol = currentHolding.volumes[volCount++] = {}
        return
      }

      if (AT_VOLUME) {
        if (el === 'enumAndChron' && AT_VOLUME)
          AT_V_ENUM_CHRON = true
      }

      // circ fields
      if (el === 'circulations' && !AT_CIRCULATIONS) {
        AT_CIRCULATIONS = true
        currentHolding.circulations = []
        return
      }

      if (el === 'circulation' && AT_CIRCULATIONS && !AT_CIRCULATION) {
        AT_CIRCULATION = true
        currentCirc = currentHolding.circulations[circCount++] = {}
        return
      }

      if (AT_CIRCULATION) {
        // bool values
        if (el === 'availableNow' || el === 'renewable' || el === 'onHold') {
          attr.forEach(function (a) {
            if (a[0] === 'value') {
              switch(a[1]) {
                case '0': currentCirc[el] = false; break
                case '1': currentCirc[el] = true; break
              }
            }
          })
        }

        return
      }
    })

    p.onCharacters(function (char) {
      charBuf += char
      return
    })

    p.onEndElementNS(function (el, attr) {
      if (AT_CIRCULATION) {
        var circCharFields = [
          'itemId', 'temporaryLocation', 'reasonUnavailable', 'enumAndChron'
        ]

        if (circCharFields.indexOf(el) > -1)
          currentCirc[el] = charBuf

        if (el === 'circulation')
          AT_CIRCULATION = false
      }

      if (el === 'circulation' && AT_CIRCULATION) {
        AT_CIRCULATION = false
        currentCirc = null
      }

      if (el === 'circulations' && AT_CIRCULATIONS) {
        AT_CIRCULATIONS = false
        removeEmptyEntries(currentHolding.circulations)
        circCount = 0
      }

      if (AT_VOLUME) {
        var volCharFields = [
          'enumAndChron'
        ]

        if (volCharFields.indexOf(el) > -1) {
          currentVol[el] = charBuf
        }
      }

      if (el === 'volume' && AT_VOLUME) {
        AT_VOLUME = false
        currentVol = false
      }

      if (el === 'volumes' && AT_VOLUMES) {
        AT_VOLUMES = false
        removeEmptyEntries(currentHolding.volumes)
        volCount = 0
      }

      if (AT_HOLDING) {
        var charFields = [
          'nucCode', 'localLocation', 'shelvingLocation', 'callNumber',
          'copyNumber', 'enumAndChron'
        ]

        if (charFields.indexOf(el) > -1)
          currentHolding[el] = charBuf

        // close out checks
        if (el === 'nucCode' && AT_NUC_CODE)
          AT_NUC_CODE = false

        if (el === 'localLocation' && AT_LOCAL_LOC)
          AT_LOCAL_LOC = false

        if (el === 'shelvingLocation' && AT_SHELVING_LOC)
          AT_SHELVING_LOC = false

        if (el === 'callNumber' && AT_CALL_NUM)
          AT_CALL_NUM = false

        if (el === 'enumAndChron' && AT_H_ENUM_CHRON)
          AT_H_ENUM_CHRON = false

        if (el === 'copyNumber' && AT_COPY_NUM) {
          currentHolding[el] = Number.parseInt(currentHolding[el], 10)
          AT_COPY_NUM = false
        }
      }


      if (el === 'holding' && AT_HOLDING) {
        AT_HOLDING = false
        currentHolding = null
      }

      if (el === 'holdings' && AT_HOLDINGS) {
        AT_HOLDINGS = false
        removeEmptyEntries(holdings)
      }

      // reset charBuf at the end of the element (+ after assignment)
      charBuf = ''
    })

    p.onEndDocument(function () {
      if (callback && typeof callback === 'function') {
        return callback(holdings)
      }
    })
  })

  parser.parseString(body)
}

function removeEmptyEntries (arr) {
  var i = 0, len = arr.length
  for (; i < len; i++) {
    if (isEmptyObject(arr[i]))
      arr.splice(i, 1)
  }
}
