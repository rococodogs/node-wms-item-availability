var https = require('https')
var parseXMLBody = require('./parse-xml-body')

module.exports = ItemAvailability

function ItemAvailability (wskey, aii) {
  if (!(this instanceof ItemAvailability))
    return new ItemAvailability(wskey, aii)

  var self = this
  this.wskey = wskey
  this.aii = aii || (this.wskey.user ? this.wskey.user.institutionId : null)

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
