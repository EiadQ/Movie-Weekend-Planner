// Variables to various orderForm page elements
const serviceSelect = document.getElementById("serviceSelect");
const minOrder = document.getElementById("minOrder");
const serviceFee = document.getElementById("serviceFee");
const genreList = document.getElementById("genreList");
const movieList = document.getElementById("movieList");
const moviesContainer = document.getElementById("moviesContainer");
const feesTotal = document.getElementById("totalFees");
const subtotalEl = document.getElementById("subtotal");
const taxEl = document.getElementById("tax");
const totalEl = document.getElementById("total");
const minOrderMsg = document.getElementById("minOrderMsg");
const submitOrderBtn = document.getElementById("submitOrder");
const orderList = document.getElementById("orderList");

let currentService = null;    // This will hold the currently-selected streaming service with all its data (e.g., genres/movies/fees etc...)
let currentGenre = "All";     // This will hold the current genre selected 
let currentOrder = {};        // Will change below to have this format:
/* [ { 
      "fees": { "Cinema Time": 1.79, "Stream It": 1.49 }, "subtotal": 20.80, "tax": 3.49, "total": 24.29, "movies": { 
         "Cinema Time": [ { "id": 50, "title": "...", ... }, ..., { "id": 51, "title": "...", ... } ],
         "Stream It":   [ { "id": 1, "title": "...", ... }, { "id": 2, "title": "...", ... }, { "id": 3, "title": "...", ... } ] }},
     { 
      "fees": { "Cinema Time": 1.79, "Stream It": 1.49 }, "subtotal": 20.80, "tax": 3.49, "total": 24.29, "movies": { 
         "Cinema Time": [ { "id": 50, "title": "...", ... }, ..., { "id": 51, "title": "...", ... } ],
         "Stream It":   [ { "id": 1, "title": "...", ... }, { "id": 2, "title": "...", ... }, { "id": 3, "title": "...", ... } ] }},
     { 
      "fees": { "Cinema Time": 1.79, "Stream It": 1.49 }, "subtotal": 20.80, "tax": 3.49, "total": 24.29, "movies": { 
         "Cinema Time": [ { "id": 50, "title": "...", ... }, ..., { "id": 51, "title": "...", ... } ],
         "Stream It":   [ { "id": 1, "title": "...", ... }, { "id": 2, "title": "...", ... }, { "id": 3, "title": "...", ... } ] }},
     ...
   ] */


// This function erases the current order
function eraseOrder() {
    currentOrder = {
        id: null,
        fees: 0,
        subtotal: 0,
        tax: 0,
        total: 0,
        movies: {}
    };
    for (const service of basicServiceData) 
        currentOrder.movies[service.name] = [];
}

// Call it upon startup
eraseOrder();

// This is the event handler for when selecting a Streaming Service
serviceSelect.addEventListener("change", () => {
    const selectedServiceID = parseInt(serviceSelect.value);

    // Get the specific data from the server for the streaming service with the selected ID
    fetch("/services/" + selectedServiceID, {
            headers: {
                "Accept": "application/json"
            }})
        .then(res => res.json())
        .then(data => {
            currentService = data;
            
            // Display the streaming service info and selecte All genres by default
            currentGenre = "All"; // Default to show All movies
            minOrder.textContent = `Minimum Order: $${currentService.minOrder.toFixed(2)}`;
            serviceFee.textContent = `Service Fee: $${currentService.serviceFee.toFixed(2)}`;
            // Update the contents on the page according to the selected service
            displayGenres();
            displayMovies();
        })
        .catch(err => {
            console.error("Error accessing streaming service information:", err);
            genreList.innerHTML = "";
            moviesContainer.innerHTML = "";
            currentService = null;
        });
});


// This displays the genres for the selected streaming service in a list
function displayGenres() {
    genreList.innerHTML = "";

    // Add an "All" list item to the genres list
    const allLi = document.createElement("li");
    allLi.textContent = "All";
    allLi.addEventListener("click", () => { // Handle clicking "All"
        currentGenre = "All";
        displayMovies();
    });
    genreList.appendChild(allLi);

    // Now add a list item for each genre from the service  
    Object.keys(currentService.genres).forEach(genre => {
        const li = document.createElement("li");
        li.textContent = genre;
        li.addEventListener("click", () => { // Handle clicking the genre
            currentGenre = genre;
            displayMovies();
        });
        genreList.appendChild(li);
    });
}

// Choose the icon to show based on whether the movie has been added to the order or not
function chooseMovieIcon(movie) {
    // If the movie is already in the order list, show as selected image otherwise as unselected
    const allMovies = Object.values(currentOrder.movies).flat();
    for (const m of allMovies) {
        if (m.id === movie.id) 
            return "/images/selected.svg"; 
    };
    return "/images/unselected.svg";
}

// Update the contents of the movies DIV
function displayMovies() {
    moviesContainer.innerHTML = ""; // Erase what is currently there

    // Change the header
    movieList.textContent = currentGenre + " Movies";

    // Now get all movies for the current service in the curent Genre
    let moviesToShow;
    if (currentGenre === "All") 
        moviesToShow = Object.values(currentService.genres).flat();
    else 
        moviesToShow = currentService.genres[currentGenre] || [];

    // Create the unordered list and add each movie to it
    const ul = document.createElement("ul");
    moviesToShow.forEach(movie => {
        // Create a list item for the movie
        const li = document.createElement("li");
        li.className = "movie-item";    // set the class name so that we can style it
        li.dataset.id = movie.id;       // add the id to the element's data set
        li.dataset.price = movie.price; // add the price to the element's data set

        // Create the image and choose the appropriate icon to place beside it
        const img = document.createElement("img");
        img.src = chooseMovieIcon(movie);
        img.className = "select-img"; // set the class name so that we can style it

        // Add an event handler to handle selecting of the movie image
        img.addEventListener("click", () => toggleMovieSelection(movie, img));

        // The list item will show the movie title, description and price
        li.innerHTML = `<span class="movie-title">${movie.title} (${movie.year})</span>
                        <p class="movie-desc">${movie.description}</p>
                        <span class="movie-price">$${movie.price.toFixed(2)}</span>`;
        li.prepend(img); // Put the image before the text
        ul.appendChild(li);
    });
    moviesContainer.appendChild(ul);
}

// This handles the selection of a movie icon to add/remove it from the order
// The movie is the one to be toggled and the imgEl is the icon on its left
function toggleMovieSelection(movie, imgEl) {
    // Check to see if the movie has already been ordered for the currently selected service
    const index = currentOrder.movies[currentService.name].findIndex(m => m.id === movie.id);

    // If it has not been ordered, show it as selected and add it to the order
    if (index === -1) {
        currentOrder.movies[currentService.name].push(movie);
        imgEl.src = "/images/selected.svg";
    } else {
        // If it has already been ordered, remove it from the order and show as unselected
        currentOrder.movies[currentService.name].splice(index, 1); // remove 1 element at the index
        imgEl.src = "/images/unselected.svg";
    }
    // Upate the order now
    updateOrderSummary();
}

// Re-display all of the order informationn
function updateOrderSummary() {
    // Erase what was there before
    orderList.innerHTML = "";
    
    // Go through the order one service at a time
    for (const key in currentOrder.movies) {
        let mvs = currentOrder.movies[key];

        // Skip over streaming services that have no movies ordered from them
        if (!mvs) 
            continue;       

        // Go through each movie for the service
        for (let i=0; i<mvs.length; i++) {
            const movie = mvs[i];
            const li = document.createElement("li"); // Create a list item

            // Store the streaming service id, movie id and movie price as data
            li.dataset.sid = key.id;
            li.dataset.id = movie.id;
            li.dataset.price = movie.price;
            
            // Show the movie information, along with a remove image
            li.innerHTML = `<img src="/images/remove.svg" class="remove-img" alt="Remove"> ${movie.title} (${movie.year}) - $${movie.price.toFixed(2)}`;
            
            // Add an event listener to allow the movie to be removed from the order
            li.querySelector("img").addEventListener("click", () => {
                // Double-check if it is to be removed by using a confirmation dialog
                if (confirm(`Remove "${movie.title}" from order?`)) {
                    // Update the list to have all movies except the one that was selected
                    mvs.splice(i, 1);
                    mvs = mvs.filter(m => m.id !== movie.id);
                    // Update the movies's selected icon in the movie list to be unselected
                    const movieItem = document.querySelector(`.movie-item[data-id='${movie.id}'] img`);
                    if (movieItem) // Make sure the movie is there ... it should always be
                        movieItem.src = "/images/unselected.svg";
                    updateOrderSummary(); // Re-draw everything again
                }
            });
            orderList.appendChild(li); // add the list item
        };
    };

    
    // Add the service fee if there are movies from that service 
    let serviceFeeAmt = { };
    let feeTotal = 0;
    let feeString = ""; // This will show all fees (potentially one for each service)
    // Go through each service and build up the fee string
    for (const service of basicServiceData) {
        // If there are any movies ordered from this service then add that service fee
        if (currentOrder.movies[service.name] && currentOrder.movies[service.name].length > 0) {
            serviceFeeAmt[service.name] = service.serviceFee;

            // Append a plus sign if there was already a service fee added
            if (feeString.length > 0) 
                feeString += " + ";
            feeString = feeString + "$" +  service.serviceFee.toFixed(2) + "";

            // Tally up the fee total while we are at it
            feeTotal += service.serviceFee;
        }
    }
    // Update the current order with the fees
    currentOrder.fees = serviceFeeAmt;

    // Calculate how much has been ordered from each service, 
    // so we can determine if the minimum order amount has been reached.
    let totalPerService = { };
    Object.entries(currentOrder.movies).forEach(([serviceName, mvs]) => {
        let cost = 0;
        mvs.forEach(movie => {
            cost += movie.price;
        });
        totalPerService[serviceName] = cost;
    });

    // Make sure that the minimum order amount has been reached for each service ordered from
    minOrderMsg.innerHTML = ""; // Start off assuming all min order requirements have been met
    for (const service of basicServiceData) {
        // Check if there was an order for this service that has not met the min requirement
        if (totalPerService[service.name] && totalPerService[service.name] > 0 && totalPerService[service.name] < service.minOrder) {
            // Hide the submit button
            submitOrderBtn.classList.add("hidden"); 
            // Determine how much remains to meet the min requirement
            const remaining = service.minOrder - parseFloat(totalPerService[service.name]);
            // Add an appropriate message
            minOrderMsg.innerHTML += "Add $" + remaining.toFixed(2) + " more from '" + 
                                     service.name + "' service to meet minimum order requirement.<br>";
        }
    }

    
    // Go through all services and get the movies then total up the prices
    let subtotal = Object.values(currentOrder.movies).flat().reduce((sum, movie) => sum + movie.price, 0);

    // Add the fees and taxes
    subtotal += feeTotal;
    const tax = subtotal * 0.13;
    const total = subtotal + tax;

    // update the HTML elements accordingly
    if (total > 0) {
        feesTotal.textContent = "Total fees: (" + feeString + ") =  $" + feeTotal.toFixed(2);
        subtotalEl.textContent = "Subtotal: $" + subtotal.toFixed(2);
        taxEl.textContent = "Tax (13%): $" + tax.toFixed(2);
        totalEl.textContent = "Total: $" + total.toFixed(2);
        
        // If there were no messages added, then all is ok and we can submit
        if (minOrderMsg.innerHTML.length === 0) {
            submitOrderBtn.classList.remove("hidden");
            // Prepare the order object's attributes
            currentOrder.subtotal = subtotal;
            currentOrder.tax = tax;
            currentOrder.total = total;
        }
    }
    else {
        feesTotal.textContent = "";
        subtotalEl.textContent = "";
        taxEl.textContent = "";
        totalEl.textContent = "";
        submitOrderBtn.classList.add("hidden"); 
    }
}


// Handle the placing of the order
submitOrderBtn.addEventListener("click", async () => {
    try {
        const res = await fetch("/submit-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(currentOrder)
        });
        if (!res.ok) throw new Error(await res.text());
        alert("Order submitted successfully!");
        resetPage();
    } catch (error) {
        alert("Error submitting order: " + error);
    }
});


// Reset the page after an order has been placed
function resetPage() {
    // Delete the order
    console.log("Deleting order");
    eraseOrder();   
    serviceSelect.value = "";
    currentService = null;
    minOrder.textContent = "";
    serviceFee.textContent = "";
    genreList.innerHTML = "";
    moviesContainer.innerHTML = "";
    submitOrderBtn.classList.add("hidden");
    movieList.textContent = "Movies";
    feesTotal.textContent = "";
    subtotalEl.textContent = "";
    taxEl.textContent = "";
    totalEl.textContent = "";
    submitOrderBtn.classList.add("hidden"); 
    updateOrderSummary();
}
