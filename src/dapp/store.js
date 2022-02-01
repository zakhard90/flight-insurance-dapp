const prefState = "state__"
const prefFlight = "flight__"
const Store = {
    persistState: (key, value, index) => {
        key = prefState + key
        key = index !== undefined ? key + "_" + index : key
        return sessionStorage.setItem(key, JSON.stringify(value));
    },
    fetchState: (key, index) => {
        key = prefState + key
        key = index !== undefined ? key + "_" + index : key
        return sessionStorage.getItem(key);
    },
    fetchAllStates: () => {
        let storage = {};
        for (let k in sessionStorage) {
            if (k.indexOf(prefState) == 0) {
                storage[k.replaceAll(prefState, "")] = JSON.parse(sessionStorage[k]);
            }
        }
        return storage
    },
    persistFlight: (key, value, index) => {
        key = prefFlight + key
        key = index !== undefined ? key + "_" + index : key
        return sessionStorage.setItem(key, JSON.stringify(value));
    },
    fetchFlight: (key, index) => {
        key = prefFlight + key
        key = index !== undefined ? key + "_" + index : key
        return JSON.parse(sessionStorage.getItem(key));
    },
    fetchAllFlights: () => {
        let storage = {};
        for (let k in sessionStorage) {
            if (k.indexOf(prefFlight) == 0) {
                storage[k.replaceAll(prefState, "")] = JSON.parse(sessionStorage[k]);
            }
        }
        return storage
    },
}

export default Store