const pref = "state__"
const Store = {
    persistState: (key, value, index) => {
        key = pref + key
        key = index !== undefined ? key + "_" + index : key
        return sessionStorage.setItem(key, value);
    },
    fetchState: (key, index) => {
        key = pref + key
        key = index !== undefined ? key + "_" + index : key
        return sessionStorage.getItem(key);
    },
    fetchAllStates: () => {
        let storage = {};
        for (let k in sessionStorage) {
            if (k.indexOf(pref) == 0) {
                storage[k.replaceAll(pref, "")] = sessionStorage[k];
            }
        }
        return storage
    }
}

export default Store