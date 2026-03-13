import { networkInterfaces } from "os"
import QRCode from "qrcode"

const nets = networkInterfaces()
const results = Object.create(null)

for (const name of Object.keys(nets)) {
    const net = nets[name]
    if( !net ) continue
    for(  const info of net ) {
        if( info.family === 'IPv4' && !info.internal ) {
            if( !results[name] ) {
                results[name] = []
            }
            results[name].push(info.address)
        }
    }
}

const localIP = results[Object.keys(results)[0]][0]

const url = `http://${localIP}:5173/?websocket_url=${encodeURIComponent(`ws://${localIP}:9090`)}`
console.log(url)
QRCode.toString(url, (error, qrcode) => {
    if( error ){
        throw error
    }
    console.log(qrcode)
})