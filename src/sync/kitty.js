import { ck } from '../ethereum/'
import { read, write } from '../db/'

const debug = false

const fetchKitty = (id) => {
  // We'll use these to store data across several scopes below
  const k = { id }
  let sale
  let sire

  // FIRST layer: Get kitty data or exit(1)
  return ck.core.methods.getKitty(id).call().then((kitty) => {
    // Copy all kitty properties 
    const props = Object.keys(kitty)
    for (let i=0; i<props.length; i++) {
      // skip fake-array indexed data
      if (isNaN(parseInt(props[i], 10))) {
        // genes is a huge number, keep that as a string
        // but other numbers should be numbers, not strings
        if (props[i] !== 'genes' && !isNaN(parseInt(kitty[props[0]], 10))) {
          // standardize all properties to lowercase
          // postgres will do this for us, let's keep it consistent
          k[props[i].toLowerCase()] = parseInt(kitty[props[i]], 10)
        } else {
          k[props[i].toLowerCase()] = kitty[props[i]]
        }
      }
    }

    // SECOND layer: Get sale data or move on to sire data
    return ck.sale.methods.getAuction(id).call().then((s) => {
      sale = s // make this var available in other scopes
      return ck.sale.methods.getCurrentPrice(id).call()

    // If we get sale data, then add it to this kitty & we're DONE!
    }).then((price) => {
      k.forsale = true
      k.forsire = false
      k.currentprice = price
      k.startprice = sale.startingPrice
      k.endprice = sale.endingPrice
      k.duration = sale.duration
      k.startedat = sale.startedAt
      k.lastsynced = new Date().getTime()/1000 // postgres expects seconds, not ms
      return (k)

    // Can't get sale data? Kitty must not be up for sale. Get sire data instead
    }).catch(() => {
      // THIRD layer: Get sire data or move on to null fillers
      return ck.sire.methods.getAuction(id).call().then((s) => {
        sire = s // make this var available in other scopes
        return ck.sire.methods.getCurrentPrice(id).call()

      // If we get sire data, then add it to this kitty & we're DONE!
      }).then((price) => {
        k.forsale = false
        k.forsire = true
        k.currentprice = price
        k.startprice = sale.startingPrice
        k.endprice = sale.endingPrice
        k.duration = sale.duration
        k.startedat = sale.startedAt
        k.lastsynced = new Date().getTime()/1000 // postgres expects seconds, not ms
        return (k)

      // Can't get sire data? Kitty must not be up for sale OR sire
      // Fill in gaps w NULL and return
      }).catch(() => {
        k.forsale = false
        k.forsire = false
        k.currentprice = null
        k.startprice = null
        k.endprice = null
        k.duration = null
        k.startedat = null
        k.lastsynced = new Date().getTime()/1000 // postgres expects seconds, not ms
        return (k)
      })
    })

  // First layer: Can't get kitty data? That's a problem, exit & try again
  }).catch((err) => {
    console.error(`getKitty(${id}) Error: ${err}`)
    process.exit(1)
  })
}

const getKitty = (id) => {
  return read.kitty(id).then((res) => {
    if (res) { return (res.rows[0]) }

    return fetchKitty(id).then((kitty) => {
      // console.log(`Saving kitty: ${JSON.stringify(kitty, null, 2)}`)
      return write.kitty(kitty).then(() => kitty)
    }).catch((err) => { console.error(`fetchKitty(${id}) Error: ${err}`); process.exit(1) })

  })
}

export { getKitty }