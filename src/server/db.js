const fs = require('fs')
const PATH = './build/server/db.json'
const DB = {
    persistOracle: (obj) => {
        let key = obj.address
        let db = {}
        try {
            if (fs.existsSync(PATH)) {
                db = fs.readFileSync(PATH);
                db = JSON.parse(db)
            }
        } catch (e) {
            console.log(e)
        }
        db[key] = JSON.stringify(obj)

        fs.writeFileSync(PATH, JSON.stringify(db, null, '\t'), 'utf-8', function (err) {
            if (err) {
                console.log("An error occured while writing JSON Object to File.");
                return console.log(err);
            }
            console.log("JSON file has been saved.");
        });

        return true
    },

    fetchOracle: (key) => {
        let output = null
        let db = {}
        if (fs.existsSync(PATH)) {
            db = fs.readFileSync(PATH);
            db = JSON.parse(db)
        }
        if (db !== undefined) {
            output = JSON.parse(db[key])
        }
        return output
    },

    fetchAllOracles: () => {
        let output = []
        let db = {}
        if (fs.existsSync(PATH)) {
            db = fs.readFileSync(PATH);
            db = JSON.parse(db)
        }
        if (db !== undefined) {
            for (let key in db) {
                output.push(JSON.parse(db[key]))
            }
        }
        return output
    }

}
export default DB