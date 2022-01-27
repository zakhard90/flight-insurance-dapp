const Actions = {
    _bindSingleEvent: (el, cause, effect) => {
        el.addEventListener(cause, effect)
    },
    _filSingleValue: (el, val) => {
        el.value = val
    },
    _findStoredValue: (el, stored) => {
        let val = "";
        for (let k in stored) {
            if (k.indexOf(el.getAttribute('id')) == 0) {
                val = stored[k]
                break
            }
        }
        return val
    },
    bindEvent: (els, cause, effect) => {
        if (HTMLCollection.prototype.isPrototypeOf(els)) {
            for (let el of els) {
                Actions._bindSingleEvent(el, cause, effect)
            }
        } else {
            Actions._bindSingleEvent(els, cause, effect)
        }
    },
    recallValues: (els, stored) => {
        if (HTMLCollection.prototype.isPrototypeOf(els)) {
            for (let el of els) {
                Actions._filSingleValue(el, Actions._findStoredValue(el, stored))
            }
        } else {
            Actions._filSingleValue(els, Actions._findStoredValue(el, stored))
        }
    },
    display: (title, description, results) => {
        let displayDiv = document.getElementById("display-wrapper")
        let rowsFrom = (results) => {
            let rows = "";
            results.map((result) => {
                rows += `
                    <div class="row">
                        <div class="col-sm-4 field">${result.label}</div>
                        <div class="'col-sm-8 field-value">${result.error ? String(result.error) : String(result.value)}</div>
                    </div>`
            })
            return rows;
        }
        let content = `<h2>${title}</h2><h5>${description}</h5>${rowsFrom(results)}`
        displayDiv.innerHTML = ""
        displayDiv.insertAdjacentHTML("beforeend", content)
    }
}

export default Actions