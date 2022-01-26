import app from './server'

const port = 3000
app.listen(port, () => console.log(`Example app listening on port ${port}!`))

if (module.hot) {
    module.hot.accept('./server', function () {
        console.log('Accepting the updated server module!');
    })
}
