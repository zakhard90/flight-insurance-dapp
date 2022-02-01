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
    _shortenAddress: (address) => {
        return address !== undefined ? address.substr(0, 5) + "..." + address.substr(address.length - 4, address.length) : "N/A"
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
        body.classList.add("bgr-" + target)
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
    userAddress: (address) => {
        let short = UI._shortenAddress(address)
        document.getElementById("user-address").innerText = short
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
    },
    displayFlightList: (flights, user, callback) => {
        if (Object.keys(flights).length > 0) {
            let displayTable = document.getElementById("flight-table")
            let rowsFrom = (flights) => {
                let rows = "";
                for (let k in flights) {
                    let flight = flights[k]
                    let isSameAirline = flight.airline === user
                    let buttonBuy = `
                            <button class="btn btn-primary btn-xs js-buy" data-airline="${flight.airline}" data-code="${flight.code}">
                                <i class="fa fa-shopping-cart"></i>
                            </button>
                            `
                    let buttonClose = `
                            <button class="btn btn-success btn-xs js-close" data-airline="${flight.airline}" data-code="${flight.code}">
                                <i class="fa fa-check-square-o"></i>
                            </button>
                            `
                    rows += `
                        <tr id="${flight.code}">
                            <td><strong>${UI._shortenAddress(flight.airline)}</strong></td>
                            <td>${flight.description}</td>
                            <td>${flight.scheduled}</td>
                            <td>${isSameAirline ? buttonClose : buttonBuy}                               
                            </td>
                        </tr>
                        `
                }
                return rows;
            }
            let content = `
                <thead>
                    <tr>
                        <th>Airline</th>
                        <th>Flight</th>
                        <th>Time</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsFrom(flights)}
                </tbody>
                `
            displayTable.innerHTML = ""
            displayTable.insertAdjacentHTML("beforeend", content)
            callback(flights)
        }
    },
    addCloseFlightButton: () => {

    },
    displayPremiumList: (events, flights, callback) => {
        if (Object.keys(events).length > 0) {
            let displayTable = document.getElementById("premiums-table")
            let rowsFrom = (events) => {
                let rows = "";
                for (let k in events) {
                    let premium = events[k]

                    for (let f in flights) {
                        let flight = flights[f]
                        if (flight.code === premium.flightCode) {
                            premium.flight = flight.description
                            premium.scheduled = flight.scheduled
                        }
                    }

                    rows += `
                        <tr>
                            <td><strong>${UI._shortenAddress(premium.airline)}</strong></td>
                            <td>${premium.flight}</td>
                            <td>${premium.scheduled}</td>
                            <td class="text-right">${premium.eth}</td>
                            <td class="text-right"><i class="fa fa-arrow-${premium.name === 'InsurancePurchased' ? 'up text-danger' : 'down text-success'}"></i></td>
                        </tr>
                        `
                }
                return rows;
            }
            let content = `
                <thead>
                    <tr>
                        <th>Airline</th>
                        <th>Flight</th>
                        <th>Time</th>
                        <th class="text-right">Premium (ETH)</th>
                        <th class="text-right"></th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsFrom(events)}
                </tbody>
                `
            displayTable.innerHTML = ""
            displayTable.insertAdjacentHTML("beforeend", content)
            callback()
        }
    },
    setInsuranceFields: (airline, flight) => {
        let fieldAirline = document.getElementById("insurance-airline")
        UI._filSingleValue(fieldAirline, airline)
        let fieldFlight = document.getElementById("insurance-flight")
        UI._filSingleValue(fieldFlight, flight)
        UI.showSection("insurance")
    },
    clearCache: () => {
        sessionStorage.clear()
        location.reload()
    }
}

export default UI