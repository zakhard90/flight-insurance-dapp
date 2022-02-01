const UI = {
    _bindSingleEvent: (el, cause, effect) => {
        if (el !== undefined && typeof el.addEventListener === "function")
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
        if (HTMLCollection.prototype.isPrototypeOf(els) ||
            NodeList.prototype.isPrototypeOf(els)) {
            for (let el of els) {
                UI._bindSingleEvent(el, cause, effect)
            }
        } else {
            let el = els
            UI._bindSingleEvent(el, cause, effect)
        }
    },
    recallValues: (els, stored) => {
        if (HTMLCollection.prototype.isPrototypeOf(els) ||
            NodeList.prototype.isPrototypeOf(els)
        ) {
            for (let el of els) {
                UI._filSingleValue(el, UI._findStoredValue(el, stored))
            }
        } else {
            let el = els
            UI._filSingleValue(el, UI._findStoredValue(el, stored))
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
    },
    showSection: (target) => {
        let section = document.getElementById(target)
        let siblings = UI.getAllSiblings(section)
        for (let el of siblings) {
            el.classList.add("d-none")
        }
        section.classList.remove("d-none")
        let body = document.body;
        body.classList = []
        body.classList.add("bgr-"+target)
    },
    heartbeat: (label, status, error) => {
        setTimeout(() => {
            let lightTarget = document.getElementById("status-light")
            let labelTarget = document.getElementById("status-label")

            if (status) {
                lightTarget.classList.add("bg-success")
                labelTarget.innerHTML = `<strong>${label}</strong>: contract is up and running`
            } else {
                lightTarget.classList.add("bg-danger")
                labelTarget.innerHTML = `<strong>${label}</strong>: contract is inactive`
            }

            lightTarget.firstElementChild.remove();
            lightTarget.classList.remove("bg-dark")
        }, 1000)
    },
    setWalletEnabled: (enabled) => {
        if (enabled) {
            let showEls = document.querySelectorAll(".js-metamask");

            if (HTMLCollection.prototype.isPrototypeOf(showEls) ||
                NodeList.prototype.isPrototypeOf(showEls)) {
                for (let el of showEls) {
                    el.classList.remove("d-none");
                }
            } else {
                let el = showEls
                el.classList.remove("d-none");
            }
            let connectWallet = document.getElementById('connect-wallet')
            connectWallet.remove()
        }
    },
    getAllSiblings: (el, filter) => {
        var sibs = [];
        el = el.parentNode.firstChild;
        do {
            if (el.nodeType === 3) continue; // text node
            if (!filter || filter(el)) sibs.push(el);
        } while (el = el.nextSibling)
        return sibs;
    }
}

export default UI