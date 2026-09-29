(() => {
  "use strict";

  const q = (id) => document.getElementById(id);
  const search = q("availability-form");
  const cin = q("checkin");
  const cout = q("checkout");
  const adults = q("adults");
  const children = q("children");
  const params = new URLSearchParams(location.search);
  const day = (date) => date.toISOString().slice(0, 10);
  const compactDate = (value) => value.replaceAll("-", "");
  const now = new Date();
  const next = new Date(Date.now() + 864e5);

  cin.min = day(now);
  cin.value = params.get("checkin") || day(now);
  cout.min = day(next);
  cout.value = params.get("checkout") || day(next);
  adults.value = params.get("adults") || 2;
  children.value = params.get("children") || 0;
  q("booking-panel").hidden = true;

  cin.onchange = () => {
    const date = new Date(cin.value + "T00:00:00");
    date.setDate(date.getDate() + 1);
    cout.min = day(date);
    if (cout.value <= cin.value) cout.value = day(date);
  };

  search.onsubmit = (event) => {
    event.preventDefault();
    if (cout.value <= cin.value) return;

    const bookingUrl = new URL(
      "https://www.goibibo.com/hotels/ajay-residency-hotel-in-gurgaon-3262594979006169746/",
    );
    bookingUrl.search = new URLSearchParams({
      checkin: compactDate(cin.value),
      checkout: compactDate(cout.value),
      roomString: `1-${adults.value}-${children.value}`,
      source: "hotel_website",
    }).toString();
    window.location.assign(bookingUrl.toString());
  };
})();
