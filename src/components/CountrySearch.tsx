//import useState
import { useState } from "react";

//define country
type Participant = {
  country: string;
  iso3: string;
};

//to receive from App.tsx
type Props = {
  participants: Participant[];
  onSelectCountry: (country: Participant) => void;
};

export default function CountrySearch({
  //to forward the entry to App.tsx
  participants,
  onSelectCountry,
}: Props) {
  //characters that are entered in the search bar
  const [query, setQuery] = useState("");

  //if empty spaces exist, trim it
  //standardize it to lower case
  const normalizedQuery = query.trim().toLowerCase();
  //to look for country
  const matches = normalizedQuery
    ? participants.filter(({ country }) =>
        country.toLowerCase().includes(normalizedQuery)
      )
    : [];

  //the search bar will be empty
  function selectCountry(country: Participant) {
    onSelectCountry(country);
    setQuery("");
  }

  return (
    <section className="country-search" aria-label="Country search">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (matches.length === 1) selectCountry(matches[0]);
        }}
      >
        <label htmlFor="country-search" className="search-label">
          Country name
        </label>
  
        <div className="search-input-wrapper">
          <svg
            className="search-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
  
          <input
            id="country-search"
            type="search"
            placeholder="Type here..."
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </form>
  
      {normalizedQuery && (
        <ul className="search-results" aria-label="Matching countries">
          {matches.map((item) => (
            <li key={item.iso3}>
              <button type="button" onClick={() => selectCountry(item)}>
                <span>{item.country}</span>
                <span className="search-country-code">{item.iso3}</span>
              </button>
            </li>
          ))}
  
          {matches.length === 0 && (
            <li className="search-empty">No countries found. Please try again.</li>
          )}
        </ul>
      )}
    </section>
  );
}

