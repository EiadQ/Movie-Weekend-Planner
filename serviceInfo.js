// Add the button listeners when the page is loaded
document.addEventListener("DOMContentLoaded", () => {
    const sID = document.getElementById("serviceId").value; // hidden input with service ID

    // Add the event handler to deal with changes to the service information
    const infoForm = document.getElementById("serviceForm");
    infoForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // Don't do the default submission, do this code instead
        
        // Gather the three pieces of data into an object
        const data = {
            name: document.getElementById("serviceName").value,
            serviceFee: parseFloat(document.getElementById("serviceFee").value),
            minOrder: parseFloat(document.getElementById("minOrder").value)
        };

        // Send it to the server using route: PUT /services/${sID}/info 
        try {
            const res = await fetch(`/services/${sID}/info`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            // If it was successful, indicate so
            if (result.success) 
                alert("Service info updated!");
        } catch (err) {
            console.error(err);
            // If it was not successful, indicate so
            alert("Error updating service info.");
        }
    });

    // Add the event handler to deal with adding a new genre
    const addGenreBtn = document.getElementById("addGenre");
    addGenreBtn.addEventListener("click", async () => {
        // Read the text field
        const newGenreInput = document.getElementById("newGenre");
        const genreName = newGenreInput.value.trim();

        // Make sure there was valid text there
        if (!genreName) 
            return alert("Please enter a genre name.");

        try {
            // Send the new genre to the server via route POST /services/${sID}/genres
            const res = await fetch(`/services/${sID}/genres`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ genre: genreName })
            });
            const result = await res.json();

            // Bring up an alert to indicate how it went, and do a page refresh if  it was ok 
            if (result.success) {
                alert(`Genre "${genreName}" added!`);
                location.reload();
            } else {
                alert(result.error);
            }
        } catch (err) {
            console.error(err);
            // Indicate that all did not go well
            alert("Error adding genre.");
        }
    });


    // Add the event handler to deal with adding a new movie
    const addMovieForm = document.getElementById("addMovie");
    addMovieForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // Don't do the default submission, do this code instead

        // Gather all the movie data
        const title = document.getElementById("movieTitle").value.trim();
        const description = document.getElementById("movieDescription").value.trim();
        const price = parseFloat(document.getElementById("moviePrice").value);
        const year = parseInt(document.getElementById("movieYear").value);
        const genre = document.getElementById("genreSelect").value;

        // Make sure that all fields are filled in
        if (!title || !description || isNaN(price) || isNaN(year) || !genre) 
            return alert("Please fill in all movie fields.");

        try {
            // Send the movie data to the server via route: POST /services/${sID}/movies
            const res = await fetch(`/services/${sID}/movies`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    genre,
                    movie: { title, description, price, year }
                })
            });
            const result = await res.json();

            // Bring up an alert to indicate how it went, and do a page refresh if  it was ok
            if (result.success) {
                alert("Movie added!");
                location.reload();
            } else {
                alert(result.error);
            }
        } catch (err) {
            console.error(err);
            alert("Error adding movie.");
        }
    });


    // Add the event handler to deal with removing a movie
    document.addEventListener("click", async (e) => {
        // Only do this for the remove icon images
        if (!e.target.classList.contains("remove-icon")) 
            return;

        // First, make sure the user wants to delete the movie
        if (!confirm("Are you sure you want to delete this movie?")) 
            return;

        try {
            // Get the movie ID
            const movieID = e.target.dataset.id;
            // Send the movie ID to the server for removal via route DELETE /services/${sID}/movies/${movieID}
            const res = await fetch(`/services/${sID}/movies/${movieID}`, { method: "DELETE" });
            const result = await res.json();

            // Bring up an alert to indicate how it went, and do a page refresh if it was ok
            if (result.success) {
                // Remove row from table
                const row = e.target.closest("tr");
                row.remove();
                alert("Movie removed!");
            } else {
                alert(result.error);
            }
        } catch (err) {
            console.error(err);
            alert("Error removing movie.");
        }
    });
});
