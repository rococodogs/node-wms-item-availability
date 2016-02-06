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

  if (!this.wskey)
    throw Error('No WSKey provided')

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
    var status = res.statusCode
    var msg

    switch (status) {
      case 200: msg = null; break
      case 400: msg = 'Bad parameters'; break
      case 401: msg = 'Application authentication error'; break
      case 403: msg = 'WSKey authorization error'; break
      case 404: msg = 'Not found'; break
      default:  msg = 'Status code of ' + status + ' returned'; break
    }

    if (msg) {
      var err = new Error(msg)
      err.statusCode = status
      return callback(err)
    }

    var body = ''
    res.setEncoding('utf8')
    res.on('data', function (d) { body += d })
    res.on('end', function () {
      return parseXMLBody(body, callback)
    })
  }).end()
}

function parseXMLBody (body, callback) {
  var parser = new Parser(function (p) {
    var holdings = []

    var holdingCount = 0
    var circCount = 0
    var volCount = 0

    var currentHolding
    var currentCirc
    var currentVol

    var charBuf = ''

    // flags
    var AT_HOLDINGS = false
    var AT_HOLDING = false
    var AT_VOLUMES = false
    var AT_VOLUME = false
    var AT_CIRCULATIONS = false
    var AT_CIRCULATION = false

    var circBoolFields = [
      'availableNow', 'renewable', 'onHold'
    ]

    p.onStartElementNS(function (el, attr) {
      if (el === 'holdings') {
        AT_HOLDINGS = true
        return
      }

      if (el === 'holding' && !AT_HOLDING) {
        AT_HOLDING = true
        currentHolding = holdings[holdingCount++] = {}
        return
      }

      if (el === 'volumes') {
        AT_VOLUMES = true
        currentHolding.volumes = []
        return
      }

      if (el === 'volume' && AT_VOLUMES && !AT_VOLUME) {
        AT_VOLUME = true
        currentVol = currentHolding.volumes[volCount++] = {}
        return
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

      // handle bool values
      if (circBoolFields.indexOf(el) > -1 && AT_CIRCULATION) {
        attr.forEach(function (a) {
          if (a[0] === 'value') {
            switch(a[1]) {
              case '0': currentCirc[el] = false; break
              case '1': currentCirc[el] = true; break
            }
          }
        })

        return
      }
    })

    p.onCharacters(function (char) {
      if (!AT_HOLDINGS) return

      charBuf += char
      return
    })

    p.onEndElementNS(function (el, attr) {
      var val = charBuf
      charBuf = ''

      // add data to circ fields
      if (AT_CIRCULATION) {
        if (el === 'circulation') {
          AT_CIRCULATION = false
          currentCirc = null
        } else if (circBoolFields.indexOf(el) === -1) {
          currentCirc[el] = val
        }

        return
      }

      if (el === 'circulations' && AT_CIRCULATIONS) {
        AT_CIRCULATIONS = false
        removeEmptyEntries(currentHolding.circulations)
        circCount = 0
        return
      }

      if (AT_VOLUME) {
        if (el === 'volume') {
          AT_VOLUME = false
          currentVol = null
        } else {
          currentVol[el] = val
        }

        return
      }

      if (el === 'volumes' && AT_VOLUMES) {
        AT_VOLUMES = false
        removeEmptyEntries(currentHolding.volumes)
        volCount = 0
        return
      }

      if (AT_HOLDING) {
        if (el === 'holding' && AT_HOLDING) {
          AT_HOLDING = false
          currentHolding = null
        } else if (el === 'copyNumber') {
          currentHolding[el] = Number.parseInt(val, 10)
        } else {
          currentHolding[el] = val
        }
        return
      }

      if (el === 'holdings' && AT_HOLDINGS) {
        AT_HOLDINGS = false
        removeEmptyEntries(holdings)
        return
      }
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
