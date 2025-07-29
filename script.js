// Your API credentials
const clientId = 'aC1cqvMId1NMyxALoq4qzaRsFQ4ddU8q';
const clientSecret = 'hGWzKOQ1xVPwd05S';

/**
 * Retrieve Amadeus OAuth token
 */
async function getAmadeusToken(clientId, clientSecret) {
  const res = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Auth failed: ${errText}`);
  }
  const data = await res.json();
  return data.access_token;
}

/**
 * Fetch Amadeus flight offers with given params
 */
async function getFlightOffers(token, params) {
  const query = new URLSearchParams(params).toString();
  const url = `https://test.api.amadeus.com/v2/shopping/flight-offers?${query}`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API Error: ${errText}`);
  }
  return res.json();
}

/**
 * Show results or errors in UI
 */
function displayResults(data, budget) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';

  if (!data || !data.data || data.data.length === 0) {
    resultsDiv.textContent = 'No flight offers found.';
    return;
  }

  // Filter by budget if specified
  let offers = data.data;
  if (budget) {
    offers = offers.filter(offer => parseFloat(offer.price.total) <= budget);
  }
  if (offers.length === 0) {
    resultsDiv.textContent = 'No flight offers fit your budget.';
    return;
  }
  // Format/display results
  offers.forEach(offer => {
    const div = document.createElement('div');
    div.className = 'offer p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300';
    const price = offer.price.total;
    const currency = offer.price.currency;
    let segmentsInfo = '';
    offer.itineraries.forEach((itinerary, idx) => {
      segmentsInfo += `<strong>Itinerary ${idx + 1}:</strong><br/>`;
      itinerary.segments.forEach(seg => {
        const dep = seg.departure;
        const arr = seg.arrival;
        segmentsInfo += `From ${dep.iataCode} at ${new Date(dep.at).toLocaleString()} -> To ${arr.iataCode} at ${new Date(arr.at).toLocaleString()}<br/>`;
      });
    });
    div.innerHTML = `
      <h3>Price: ${price} ${currency}</h3>
      <p>${segmentsInfo}</p>
    `;
    resultsDiv.appendChild(div);
  });
}

/**
 * Wire up the form and handle API interaction
 */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById("search-form");
  const resultsDiv = document.getElementById('results');

  $("#submit").addEventListener('click', async (event) => {
    event.preventDefault();
    resultsDiv.textContent = 'Searching...';

    // Collect form values
    const origin = document.getElementById('origin').value.trim().toUpperCase();
    const destination = document.getElementById('des').value.trim().toUpperCase();
    const departureDate = document.getElementById('departureDate').value;
    const people = parseInt(document.getElementById('people').value, 10);
    const maxResults = parseInt(document.getElementById('maxResults').value, 10) || 5;
    const budgetInput = document.getElementById('budget').value.trim();
    const budget = budgetInput ? parseFloat(budgetInput) : null;

    if (!origin || !destination || !departureDate || !people) {
      resultsDiv.textContent = 'Please fill in all required fields.';
      return;
    }

    try {
      const token = await getAmadeusToken(clientId, clientSecret);

      const params = {
        originLocationCode: origin,
        destinationLocationCode: destination,
        departureDate: departureDate,
        adults: people,
        max: maxResults
      };

      // You could add more params (children, travelClass, etc.) if desired.
      const data = await getFlightOffers(token, params);
      displayResults(data, budget);

    } catch (error) {
      resultsDiv.textContent = 'Error: ' + error.message;
      console.error(error);
    }
  });
});

(function () {
    const pagesData = [];
    let cities = [], isPopState = false, packages = [];

    /**
     * This function switches the page based on the provided page name.
     * @param {String} page 
     * @returns 
     */
    function switchPage(page) {
        const isPageDes = page.includes("des");
        const existPage = findPageIndex(page, isPageDes);
        page = page.includes("index") ? "home" : page;
        if (existPage !== -1) {  
            renderCachedPage(page, isPageDes, existPage);
            return;
        }
        fetchAndRenderPage(page, isPageDes);
    }
    /**
     * Finds if the page exists in the cached pages data.
     * @param {String} page 
     * @param {Boolean} isPageDes 
     * @returns 
     */
    function findPageIndex(page, isPageDes) {
        return pagesData.findIndex((item) => {
            return Object.keys(item)[0].includes(isPageDes ? "destinations" : page);
        });
    }
    /**
     * If the page exists in the cache, this function renders it from the array, pagesData.
     * @param {String} page 
     * @param {Boolean} isPageDes 
     * @param {Boolean} existPage 
     */
    function renderCachedPage(page, isPageDes, existPage) {
        $("main").html(pagesData[existPage][isPageDes ? "destinations" : page]);
        if (isPageDes) {
            handleDestinationPage(page);
        } else {
            handleRegularPage(page);
        }
        localStorage.setItem("lastPage", page);
        attachLinkBtnHandlers();
    }
    /**
     * Fetchs the page from the pages directory and renders it.
     * @param {String} page 
     * @param {Boolean} isPageDes 
     */
    function fetchAndRenderPage(page, isPageDes) {
        try {
            $.ajax({
                url: `/pages/${isPageDes ? "destinations" : page}.html`,
                method: "GET",
                dataType: "html",
                success: (data) => {
                    $("main").html(data);
                    localStorage.setItem("lastPage", page);
                    if (isPageDes) {
                        handleDestinationPage(page);
                    } else {
                        handleRegularPage(page);
                    }
                    attachLinkBtnHandlers();
                    pagesData.push({ [isPageDes ? "destinations" : page]: data });
                },
                error: function () {
                    $("main").text("Sorry! The Page did not load!");
                }
            });
        } catch (err) {
            console.log(err);
        }
    }
    /**
     * This handles the destination page by extracting the city name from the page string.
     * @param {String} page 
     */
    function handleDestinationPage(page) {
        let cityName = page.slice(4);
        const itemD = cities.find((val) => val.cityName.includes(cityName));
        if (itemD === undefined) {
            let error = $("<h1>");
            error.text("This destiniations does not exist!");
            $("main").html(error);
            throw new Error("City does not exist");
        }
        desCityBuilder(cityName);
        if (isPopState) {
            history.pushState({ page: 'destinations', id: cityName }, '', `/pages/destinations.html?city=${cityName}`);
        }
        isPopState = true;
        $("title").text(titleCase(cityName));
    }
    /**
     * Handles the regular pages 
     * @param {String} page 
     */
    function handleRegularPage(page) {
        if (isPopState) {
            history.pushState({ "pages": page }, '', `/pages/${page}.html`);
        }
        if (page.includes("package")) {
            setUpPackages();}
        if (page === "survey") {
            setUpSurveyPage();
        }
        isPopState = true;
        $("title").text(titleCase(page));
    }
    /**
     * Attaches click event handlers to all elements with the class 'link-btn'.
     */
    function attachLinkBtnHandlers() {
        $(".link-btn").each(function (ind, ele) {
            $(ele).off("click").on("click", function (e) {
                switchPageClickEffect(e.target.getAttribute("routes"));
            });
        });
    }
    /**
     * Return a title case item
     * @param {String} item 
     * @returns 
     */
    function titleCase(item) {
        return item[0].toUpperCase() + item.slice(1, item.length);
    }
    /**
     * This fills the destinations page with a item also fills the wonder
     * @param {Object} item 
     */
    function desCityBuilder(item) {
        const itemD = cities.find((val) => val.cityName.includes(item)),
            crumbs = $("<h5/>").text(itemD.cityName).addClass("text-accent underline bold");
        let index = cities.indexOf(itemD);
        //$(".des-banner").attr("src", itemD.cityBannerImg);
        $(".des-head").text(itemD.cityName);
        $(".des-description").text(itemD.cityDescription)
        $(".des-loc").text(itemD.cityLoc)
        $(".des-attr").text(itemD.cityAttribute)
        $(".des-crumbs").append(crumbs);
        $(".city-Name").text(itemD.cityName)
        $(".des-large").attr("src", itemD.cityLargeImg)
        // Builds Wonders
        const wonders = itemD.cityWonders;
        const wondersEle = wonders.map((item) => {
            let container = $("<div>").addClass("rounded-xl p-3 text-white flex flex-col items-center space-y-2 size-full mx-auto shadow-sm bg-primary/50 xl:px-2 xl:py-2 xl:mx-0"),
                textContainer = $("<div>").addClass("p-2 flex flex-col space-y-2"),
                name = $("<h4/>").addClass("text-lx font-bold xl:text-2xl").text(item.wonderName),
                img = $("<img/>").addClass("rounded-xl object-cover size-full xl:w-[30rem] xl:h-[20rem] aspect-square shadow-sm ").attr("src", item.wonderImg),
                description = $("<p>").addClass("text-sm xl:text-lg xl:w-[20rem] font-light").text(item.wonderDescription);
            textContainer.append(name, description)
            container.append(img, textContainer);
            return container
        });
        for (var item of wondersEle) {
            $(".des-wonder").append(item)
        }
        // Builds tops stuff based on cityTop Keys
        Object.keys(itemD.cityTop).forEach((item, index) => {
            $("." + item).text(Object.values(itemD.cityTop)[index]).addClass(" p-2 xl:p-3")
        })
        index = (index + 3) >= cities.length ? 0 : index
        desCardBuilder(cities.slice(index + 1, index + 4))
    }
    /**
     * Creates the destinations buttons 
     */
    function desLinkBuilder(data, place) {
        data.forEach((item, index) => {
            let container = $("<div/>").addClass(`flex items-center space-x-2 space-y-1 p-2 ${index + 1 === data.length ? "hover:rounded-b-xl" : "hover:rounded-none"}`),
                img = $("<img/>").attr("src", item.cityBannerImg).addClass("rounded size-10 "),
                btn = $("<h5/>").text(item.cityName).addClass("inline hover:cursor-pointer capitalize link-btn ").attr("routes", "des-" + item.cityName);
            container.append(img, btn);
            $(place).append(container);
        })
    }
    /**
     * This builds the destination cards for the other cities
     * @param {Array} dataArr 
     */
    function desCardBuilder(dataArr) {
        dataArr.forEach((item) => {
            let container = $("<div/>")
                .attr("routes", "des-" + item.cityName).on("click", (e) => switchPageClickEffect(e.target.getAttribute("routes")))
                .addClass("flex flex-col items-center space-y-4 rounded hover:cursor-pointer shadow-sm bg-secondary/50 xl:px-2 xl:py-5 xl:p-10 ease-in-out delay-100 hover:scale-90 transition-all"),
                seal = $("<img/>").attr("src", item.cityBannerImg).addClass("size-20").attr("routes", "des-" + item.cityName),
                cityName = $("<h3/>").text(item.cityName).addClass("capitalize text-white text-2xl").attr("routes", "des-" + item.cityName);
            container.append(seal, cityName)
            $(".des-other").append(container);
        })
    }
    /**
     * This fetches cities.json and performace a optional
     * callback inside of the fetch
     * @param {Function} callback 
     */
    function setUpCities(callback) {
        $.getJSON("data/cities.json", (data) => {
            cities = data.data;
            desLinkBuilder(cities, ".des-cont");
            desLinkBuilder(cities, "#foo-des-links");
            if (callback) {
                callback();
            }
        });
    }
    function setUpPackages() {
        if (packages.length > 0) {
            packageBuilder(packages);
            return;
        }
        $.getJSON("../data/packages.json", (data) => {
            packages = data.data;
            packageBuilder(data.data);
        });
    }
    function setUpSurveyPage() {
        const form = document.getElementById("search-form");
  const resultsDiv = document.getElementById('results');

  $("#submit").click( async (event) => {
    resultsDiv.textContent = 'Searching...';

    // Collect form values
    const origin = document.getElementById('origin').value.trim().toUpperCase();
    const destination = document.getElementById('des').value.trim().toUpperCase();
    const departureDate = document.getElementById('departureDate').value;
    const people = parseInt(document.getElementById('people').value, 10);
    const maxResults = parseInt(document.getElementById('maxResults').value, 10) || 5;
    const budgetInput = document.getElementById('budget').value.trim();
    const budget = budgetInput ? parseFloat(budgetInput) : null;

    if (!origin || !destination || !departureDate || !people) {
      resultsDiv.textContent = 'Please fill in all required fields.';
      return;
    }

    try {
      const token = await getAmadeusToken(clientId, clientSecret);

      const params = {
        originLocationCode: origin,
        destinationLocationCode: destination,
        departureDate: departureDate,
        adults: people,
        max: maxResults
      };

      // You could add more params (children, travelClass, etc.) if desired.
      const data = await getFlightOffers(token, params);
      displayResults(data, budget);

    } catch (error) {
      resultsDiv.textContent = 'Error: ' + error.message;
      console.error(error);
    }
  });
};
    
    function packageBuilder(packages) {
        packages.forEach((item) => {
            let container = $("<div/>").addClass("bg-white rounded-xl p-3 shadow-sm border-gray-200 h-full flex flex-col justify-between items-center"),
                img = $("<img/>").addClass("rounded-xl object-cover size-[25rem] aspect-square shadow-xs").attr("src", item.image),
                textContainer = $("<div/>").addClass("p-2 w-full flex flex-col items-center space-between"),
                inlcudesContainer = $("<div/>").addClass("flex flex-col space-y-2 mb-3"),
                includesTitle = $("<h5/>").addClass("text-lg font-semibold text-gray-900").text("This Package Includes:"),
                includesList = $("<ul/>").addClass("list-disc pl-6 space-y-2 mb-2 text-gray-600 mt-4 overflow-auto h-[10rem]"),
                includesNight = $("<li/>").text(item.includes.nights),
                includesFeatures = $("<li/>").text(item.includes.feature),
                includesExcursionsTitle = $("<li/>").addClass("text-lg font-semibold text-gray-900 mt-2").text("Excursions:"),
                includesExcursionsContainer = $("<ol/>").addClass("list-decimal pl-6 mt-1 text-gray-500 space-y-1"),
                titleContainer = $("<div/>").addClass("flex flex-col space-y-2 justify-center items-center mb-3"),
                title = $("<h5/>").addClass("mb-2 text-xl md:text-2xl xl:text-4xl font-bold text-left tracking-tight text-gray-900").text(item.packageName),
                attrTitle = $("<h5/>").addClass("text-sm font-semibold text-gray-500").text(item.packageAttr),
                btnContainer = $("<div/>").addClass("flex flex-col p-5 items-center md:flex-row md:space-y-0 md:space-x-2 space-y-2"),
                description = $("<p/>").addClass("mb-3 font-normal text-gray-700").text(item.description),
                price = $("<span/>").addClass("p-5 text-sm").text("Starting at "),
                priceValue = $("<span/>").addClass("font-bold").text(item.price),
                route = $("<button/>").addClass("p-5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-accent hover:cursor-pointer link-btn")
                    .attr("routes", "des-" + item.packageName).text("Explore " + item.packageName);
            item.includes.excursions.forEach((excursion) => {
                let excursionItem = $("<li/>").text(excursion);
                includesExcursionsContainer.append(excursionItem);
            });
            price.append(priceValue);
            titleContainer.append(title, attrTitle);
            btnContainer.append(price, route);
            includesList.append(includesNight, includesExcursionsTitle, includesExcursionsContainer, includesFeatures);
            inlcudesContainer.append(includesTitle, includesList);
            textContainer.append(titleContainer, description, inlcudesContainer, btnContainer);
            container.append(img, textContainer);
            $(".packs-cont").append(container);
        });
        attachLinkBtnHandlers();
    }
    /**
     * This handles click effect for switching pages, also hides the
     * destinations container and scrolls to the top if not at top
     * @param {Text} ele 
     */
    function switchPageClickEffect(ele) {
        let route = String(ele);
        if (!localStorage.getItem("lastPage").includes(route)) {
            switchPage(route);
        }
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        $(".des-cont").slideUp("linear");
    }
    /**
     * This will excute when the document is fulley loaded
     */
    $(document).ready(() => {
        // By default the Home page will be loaded first 
        if (localStorage.getItem("lastPage") === null) {
            localStorage.setItem("lastPage", "home");
            switchPage("home");
        } else {
            setUpCities(() => {
                isPopState = true;
                switchPage(localStorage.getItem("lastPage"));
                $(".link-btn").click((e) => switchPageClickEffect(e.target.getAttribute("routes")));
            })
        }
        $(".des-cont").hide();
        $("#des-btn").click(() => {
            $(".des-cont").slideToggle("linear");
        })
    })
    $(window).on("popstate", function (event) {
        let params = new URLSearchParams(window.location.search);
        let cityName = params.get("city");
        let path = window.location.pathname;
        let page = path.split("/").pop().replace(".html", "");
        isPopState = false;
        if (page === "destinations" && cityName) {
            switchPage("des-" + cityName);
        } else {
            switchPage(page);
        }
    });
})();
