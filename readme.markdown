# WMS Item Availability

[![Build Status](https://travis-ci.org/malantonio/node-wms-item-availability.svg?branch=master)](https://travis-ci.org/malantonio/node-wms-item-availability)

Using an OCLC number, check the availability of an item at an institution.

**Note:** Though the [Availability API][avail-api] does return bibliographic
data, this module only returns information regarding the item's local availability:
available, barcode, shelving location, call number, etc.

## usage

```
npm install wms-item-availability
```

```javascript
var WSKey = require('oclc-wskey')
var ItemAvailability = require('wms-item-availability')
var key = new WSKey('public_key', 'secret')
var instId = 128807
var avail = ItemAvailability(key, instId)

avail.query(123456, function (err, holdings) {
  if (err) throw err

  console.log(holdings.length)
})
```

### var avail = new ItemAvailability(wskey, institutionId)

Requires a [WSKey][gh-oclc-wskey] to be passed (used for creating an
`Authorization` header). `institutionId` is your institution's OCLC numerical ID
(the OCLC example ID is `128807`).

### avail.query(oclcNumber, callback)

Queries the institution for holdings of an item with the OCLC number. `callback`
takes `(error, holdings)` as parameters, where `holdings` is an array of holding
objects (see [Availability fields below][#availability-fields] for keys).

## Availability fields

from [Availability API docs][avail-api]. Items _in italic_ are not always
returned ("not required" per the api). `volumes` and `circulations` are arrays.

NAME                                           | DESCRIPTION
-----------------------------------------------|-------------------
typeOfRecord                                   | The type  comes from the MARC Holdings LDR 06
encodingLevel                                  | The encoding level of record comes from the MARC LDR 017
format                                         | The format comes from the MARC Holdings 007
receiptAcqStatus                               | The acquisitions receipt status from the MARC Holdings 008 06
generalRetention                               | General retention policy from the MARC Holdings 008 12
completeness                                   | Completeness from the MARC Holdings 008 16
dateOfReport                                   | Date of report from the MARC Holdings 008
nucCode                                        | Location from the MARC Holdings 852 $a
localLocation                                  | Sublocation or collection from the MARCHoldings 852 $b
shelvingLocation                               | Shelving Location from the MARC Holdings 852 $c
callNumber                                     | Call number from the MARC Holdings 852 $h
copyNumber                                     | Copy number from the MARC Holdings 852 $t
_enumAndChron_                                 | Summary enumerations and chronology information for serial
volumes                                        | Element that contains the volumes if the item has any
_volumes/volume_                               | Element that contains the information for each volume
_volumes/volume/enumeration_                   | Periodical enumeration information
_volumes/volume/chronology_                    | Periodical chronology information
_volumes/volume/enumAndChron_                  | Periodical enumeration/chronology information
circulations                                   | Element that contains circulation elements
circulations/circulation                       | Element that contains circulation information for each volume
circulations/circulation/availableNow          | If the item is available or not
_circulations/circulation/availabilityDate_    | If the item isn't available when is it expected to be available. Typically the due date in the system for the item
circulations/circulation/itemId                | The item barcode
circulations/circulation/renewable             | If the item is renewable or not
circulations/circulation/onHold                | If the item has holds placed on it or not
_circulations/circulation/onHold/enumAndChron_ | Periodical enumeration/chronology information



[gh-oclc-wskey]: https://npmjs.com/oclc-wskey
[avail-api]: http://www.oclc.org/developer/develop/web-services/wms-availability-api/opac-record.en.html
