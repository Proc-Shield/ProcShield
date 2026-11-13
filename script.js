document.addEventListener('DOMContentLoaded', function(){
  var yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navlinks');
  if(toggle && links){
    toggle.addEventListener('click', function(){
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ links.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); });
    });
  }

  var revealTargets = document.querySelectorAll('.reveal, .grid-3 .person');
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){ entry.target.classList.add('in'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.15 });
  revealTargets.forEach(function(el){ io.observe(el); });

  // Load homepage event details from event.html
  var homeEventCard = document.getElementById("homeEventCard");

  if (homeEventCard) {

    fetch("event.html", { cache: "no-cache" })

      .then(function(response) {
        if (!response.ok) {
          throw new Error("Could not load event page");
        }
        return response.text();
      })

      .then(function(html) {

        var eventPage = new DOMParser().parseFromString(
          html,
          "text/html"
        );

        // Copy information from event.html into the homepage card.
        function copyEventText(sourceId, targetId) {

          var source = eventPage.getElementById(sourceId);
          var target = document.getElementById(targetId);

          if (source && target) {
            target.textContent = source.textContent
              .replace(/\s+/g, " ")
              .trim();
          }
        }

        copyEventText("eventTitle", "homeEventTitle");
        copyEventText("eventSummary", "homeEventSummary");
        copyEventText("eventDate", "homeEventDate");
        copyEventText("eventDay1", "homeEventDay1");
        copyEventText("eventDay2", "homeEventDay2");
        copyEventText("eventFormat", "homeEventFormat");

        // Determine whether the event is upcoming or has passed.
        var sourceStatus = eventPage.getElementById("eventStatus");
        var homeStatus = document.getElementById("homeEventStatus");

        var isPastEvent = false;

        if (sourceStatus) {

          var startDate = sourceStatus.dataset.eventStart;
          var endDate = sourceStatus.dataset.eventEnd;

          if (startDate && endDate) {

            var start = new Date(startDate + "T00:00:00");
            var end = new Date(endDate + "T23:59:59");
            var today = new Date();

            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {

              if (today < start) {
                homeStatus.textContent = "UPCOMING EVENT";
              } else if (today <= end) {
                homeStatus.textContent = "HAPPENING NOW";
              } else {
                homeStatus.textContent = "PAST EVENT";
                isPastEvent = true;
              }

            }

          }

        }

        // Copy the registration URL from the event page.
        var sourceRegisterLink =
          eventPage.getElementById("eventRegisterLink");

        var homeRegisterLink =
          document.getElementById("homeEventRegister");

        if (homeRegisterLink) {

          if (isPastEvent) {

            homeRegisterLink.href = "event.html";
            homeRegisterLink.textContent = "View event details";
            homeRegisterLink.target = "_self";
            homeRegisterLink.removeAttribute("rel");

          } else if (sourceRegisterLink) {

            homeRegisterLink.href = sourceRegisterLink.href;
            homeRegisterLink.textContent =
              sourceRegisterLink.textContent.trim() || "Register Here";

            homeRegisterLink.target = "_blank";
            homeRegisterLink.rel = "noopener noreferrer";

          }

        }

      })

      .catch(function(error) {
        console.error("Homepage event loading error:", error);
      });

  }

});
