(() => {
  "use strict";
  const c = window.AJAY_BOOKING_CONFIG || {},
    q = (id) => document.getElementById(id),
    search = q("availability-form"),
    form = q("booking-form"),
    results = q("room-results"),
    msg = q("message"),
    room = q("room-id"),
    cin = q("checkin"),
    cout = q("checkout"),
    adults = q("adults"),
    children = q("children"),
    money = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
  let rooms = [];
  const day = (d) => d.toISOString().slice(0, 10),
    now = new Date(),
    next = new Date(Date.now() + 864e5),
    params = new URLSearchParams(location.search);
  cin.min = day(now);
  cin.value = params.get("checkin") || day(now);
  cout.min = day(next);
  cout.value = params.get("checkout") || day(next);
  adults.value = params.get("adults") || 2;
  children.value = params.get("children") || 0;
  const configured = !!(c.supabaseUrl && c.supabaseAnonKey);
  if (!configured) q("booking-panel").hidden = true;
  const escapeHtml = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
          character
        ],
    );
  cin.onchange = () => {
    const d = new Date(cin.value + "T00:00:00");
    d.setDate(d.getDate() + 1);
    cout.min = day(d);
    if (cout.value <= cin.value) cout.value = day(d);
  };
  function notice(text, error = true) {
    msg.hidden = !text;
    msg.className = "notice " + (error ? "error" : "success");
    msg.textContent = text;
  }
  async function rpc(name, data) {
    const r = await fetch(`${c.supabaseUrl}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: {
          apikey: c.supabaseAnonKey,
          Authorization: `Bearer ${c.supabaseAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }),
      p = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(p.message || "Booking service error.");
    return p;
  }
  function nights() {
    return (new Date(cout.value) - new Date(cin.value)) / 864e5;
  }
  function render(list) {
    rooms = list;
    room.innerHTML = '<option value="">Select a room</option>';
    if (!list.length) {
      results.innerHTML =
        '<div class="card muted">No rooms available. Try other dates or call +91 81304 11881.</div>';
      form.hidden = true;
      return;
    }
    results.innerHTML = list
      .map(
        (r) =>
          `<article class="card room"><div><p class="eyebrow">${r.available_count} left</p><h3>${r.room_name}</h3><p class="muted">Up to ${r.max_adults} adults · Pay at hotel</p></div><div class="price"><strong>${money.format(r.nightly_rate)}</strong><small>/night</small><p>${money.format(r.stay_total)} total</p><button type="button" data-id="${r.room_id}">Select</button></div></article>`,
      )
      .join("");
    list.forEach((r) =>
      room.add(
        new Option(`${r.room_name} — ${money.format(r.stay_total)}`, r.room_id),
      ),
    );
    form.hidden = false;
    const requestedRoom = params.get("room");
    const preferred = list.find(
      (item) =>
        item.room_name.toLowerCase().replace(/\s+/g, "-") === requestedRoom,
    );
    if (preferred) {
      room.value = preferred.room_id;
      room.dispatchEvent(new Event("change"));
    }
  }
  async function find(e) {
    e && e.preventDefault();
    notice("");
    if (cout.value <= cin.value)
      return notice("Check-out must be after check-in.");
    if (!configured) {
      const bookingUrl = new URL("https://www.mytravaly.in/hotel");
      bookingUrl.search = new URLSearchParams({
        hotelid: "dYDKTRRT",
        check_in: cin.value,
        check_out: cout.value,
        adults: adults.value,
        children: children.value,
        booking_source: "hotel_website",
        bookingSource: "hotel_website",
        rid: "1",
        clickType: "CRS",
        clickTypeLanding: "hotel",
        dateType: "default",
        no_of_days: String(nights()),
        currency: "INR",
        country: "IN",
        lg: "en",
        device: window.innerWidth < 768 ? "mobile" : "desktop",
        source: "organic",
      }).toString();
      window.location.assign(bookingUrl.toString());
      return;
    }
    results.innerHTML =
      '<div class="card muted">Checking live availability…</div>';
    try {
      render(
        await rpc("search_available_rooms", {
          p_check_in: cin.value,
          p_check_out: cout.value,
          p_adults: +adults.value,
        }),
      );
      history.replaceState(
        null,
        "",
        `?checkin=${cin.value}&checkout=${cout.value}&adults=${adults.value}&children=${children.value}`,
      );
    } catch (e) {
      notice(e.message);
      results.innerHTML =
        '<div class="card muted">Please call the hotel for availability.</div>';
    }
  }
  search.onsubmit = find;
  results.onclick = (e) => {
    const b = e.target.closest("button[data-id]");
    if (!b) return;
    room.value = b.dataset.id;
    room.dispatchEvent(new Event("change"));
    q("booking-panel").scrollIntoView({ behavior: "smooth" });
  };
  room.onchange = () => {
    const r = rooms.find((x) => String(x.room_id) === room.value);
    q("summary").textContent = r
      ? `${r.room_name} · ${nights()} night${nights() == 1 ? "" : "s"} · ${money.format(r.stay_total)} · Pay at hotel`
      : "";
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    notice("");
    const b = q("submit-booking"),
      d = new FormData(form);
    b.disabled = true;
    b.textContent = "Reserving…";
    try {
      let x = await rpc("create_pay_at_hotel_booking", {
        p_room_id: +d.get("room_id"),
        p_check_in: cin.value,
        p_check_out: cout.value,
        p_adults: +adults.value,
        p_children: +children.value,
        p_guest_name: d.get("guest_name").trim(),
        p_guest_email: d.get("guest_email").trim(),
        p_guest_phone: d.get("guest_phone").trim(),
        p_special_requests: d.get("special_requests").trim(),
      });
      x = Array.isArray(x) ? x[0] : x;
      q("booking-panel").innerHTML =
        `<div class="confirmation"><p class="eyebrow">Reservation received</p><h2>Thank you, ${escapeHtml(x.guest_name)}.</h2><p>Reference: <strong>${escapeHtml(x.booking_reference)}</strong></p><p>${escapeHtml(x.room_name)}<br>${escapeHtml(x.check_in)} to ${escapeHtml(x.check_out)}<br>${money.format(x.total_amount)} · Pay at hotel</p><a class="button" href="index.html">Return home</a></div>`;
    } catch (err) {
      notice(err.message);
      b.disabled = false;
      b.textContent = "Reserve — Pay at Hotel";
      await find();
    }
  };
  if (configured) find();
})();
