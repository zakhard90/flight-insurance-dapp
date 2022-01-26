
// import http from 'http'
// import app from './server'

// const server = http.createServer(app)
// let currentApp = app
// server.listen(3000)

// if (module.hot) {
//  module.hot.accept('./server', () => {
//   server.removeListener('request', currentApp)
//   server.on('request', app)
//   currentApp = app
//  })
// }

// if (module.hot) {
//     module.hot.accept('./server', function () {
//         console.log('Accepting the updated server module!');
//     })
// }

import app from './server'

const port = 3000
app.listen(port, () => console.log(`Example app listening on port ${port}!`))

if (module.hot) {
    module.hot.accept('./server', function () {
        console.log('Accepting the updated server module!');
    })
}
