// Add the button listeners when the page is loaded
document.addEventListener("DOMContentLoaded", () => {
    // Add the event handler to deal with adding a new service name to the list
    document.getElementById("addService").addEventListener("click", async () => {
        // Read the text field
        const newServiceInput = document.getElementById("newServiceName");
        const serviceName = newServiceInput.value.trim();

        // Make sure there was valid text there
        if (!serviceName) 
            return alert("Please enter a service name.");

        try {
            // Send the new service name to the server via route POST /services/
            const res = await fetch(`/services`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: serviceName })
            });
            const result = await res.json();

            // Bring up an alert to indicate how it went, and do a page refresh if it was ok 
            if (result.success) {
                alert(`Streaming-Service "${serviceName}" added!`);
                location.reload();
            } else {
                alert(result.error);
            }
        } catch (err) {
            console.error(err);
            // Indicate that all did not go well
            alert("Error adding streaming service.");
        }
    });


    


    // Add the event handler to deal with removing a service
    document.addEventListener("click", async (e) => {
        // Only do this for the remove icon images
        if (!e.target.classList.contains("remove-service-icon")) 
            return;

        // First, make sure the user wants to delete the service
        if (!confirm("Are you sure you want to delete this Streaming-Service?")) 
            return;

        try {
            // Send the service ID to the server for removal via route DELETE /services/${sID}
            const sID = e.target.dataset.id;
            const res = await fetch(`/services/${sID}`, { method: "DELETE" });
            const result = await res.json();

            // Bring up an alert to indicate how it went, and do a page refresh if it was ok
            if (result.success) {
                // Remove row from table
                const row = e.target.closest("tr");
                row.remove();
                alert("Service removed!");
            } else {
                alert(result.error);
            }
        } catch (err) {
            console.error(err);
            alert("Error removing service.");
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
            const sID = e.target.dataset.id;
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
