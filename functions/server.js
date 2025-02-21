const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const NodeCache = require("node-cache");

const app = express();
const cache = new NodeCache({ stdTTL: 604800 }); // Cache for 7 days
const proxy = `https://adultempire.lustycodes.workers.dev/?url=`;

// Helper function to convert runtime format to total minutes
const convertRuntimeToMinutes = (runtimeStr) => {
  const regex = /(\d+)\s*hrs?\.\s*(\d+)\s*mins?\./;
  const match = runtimeStr.match(regex);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours * 60 + minutes;
  }
  return 0;
};

const getMovieInfo = async (movieID) => {
  try {
    const cachedData = cache.get(movieID);
    if (cachedData) {
      return { source: "cache", ...cachedData };
    }

    const url = `https://www.adultempire.com/${movieID}`;
    const { data } = await axios.get(`${proxy}${encodeURIComponent(url)}`);
    const $ = cheerio.load(data);

    // Extracting and cleaning title
    const raw_title = $("h1").text().trim();
    const cleanedText = raw_title.replace(/[\n\t]+/g, " ").trim();
    const title = cleanedText.replace(/\s*- On Sale!.*$/, "").trim();

    // Extracting backdrop path
    const backdropPathStyle = $("#previewContainer").attr("style");
    const backdrop_url = backdropPathStyle
      ? backdropPathStyle.match(/background-image:\s*url\(([^)]+)\)/)[1]
      : "";
    const backdrop_split = backdrop_url ? backdrop_url.split("/")[6] : "";
    const backdrop_path =
      backdrop_split &&
      `https://caps1cdn.adultempire.com/o/1920/1080/${backdrop_split}`;

    // Extracting genres
    const genres = [];
    $(".movie-page__content-tags__categories a").each((index, element) => {
      const href = $(element).attr("href");
      const name = $(element).text().trim();
      const id = href ? href.split("/")[1] : "";
      genres.push({ id, name });
    });

    // Extracting overview
    const overview = $(".synopsis-content").text().trim();

    // Extracting poster path
    const poster_path = $(".boxcover-container a").attr("data-href");

    // Extracting runtime
    const runtimeElement = $('div.col-sm-4 ul.list-unstyled li').filter(function() {
      return $(this).text().trim().startsWith('Length:');
    });

    const runtimeStr = runtimeElement.contents().filter(function() {
      return this.nodeType === 3; // Node type 3 is a text node
    }).text().trim();

    const runtime = convertRuntimeToMinutes(runtimeStr);

    // Extracting vote average
    const vote_average = $(".rating-stars-avg").text().trim();

    // Extracting vote count
    const vote_count =
      $('e-user-actions[:variant="\'like\'"]').attr(":count") || 0;

    // Extracting backdrops
    const backdrops = [];
    $("div.col-xs-6 img.img-full-responsive").each((index, element) => {
      const file_url = $(element).attr("data-bgsrc");
      if (file_url) {
        const file_url_split = file_url.split("/")[6] || "";
        const file_path = `https://caps1cdn.adultempire.com/o/1920/1080/${file_url_split}`;
        backdrops.push({ file_path });
      }
    });

    // Extracting cast
    const cast = [];
    $(".movie-page__content-tags__performers a").each((index, element) => {
      const href = $(element).attr("href");
      const name = $(element).text().trim();

      const performerId = href ? href.split("/")[1] : "";
      const profile_path = performerId
        ? `https://imgs1cdn.adultempire.com/actors/${performerId}h.jpg`
        : "";
      cast.push({
        id: performerId,
        name,
        profile_path,
        known_for_department: "Acting",
      });
    });

    // Extracting crew
    const crew = [];
    $(".movie-page__heading__movie-info a").each((index, element) => {
      const href = $(element).attr("href");
      const name = $(element).text().trim();
      const crewId = href ? href.split("/")[1] : "";
      const profile_path = crewId
        ? `https://imgs1cdn.adultempire.com/studio/${crewId}.jpg`
        : "";

      if (crewId) {
        crew.push({
          id: crewId,
          name,
          profile_path,
          known_for_department: "Directing",
          department: "Directing",
        });
      }
    });

    // Movie data object
    const movieData = {
      id: movieID,
      title,
      backdrop_path,
      genres,
      overview,
      poster_path,
      runtime,
      vote_average,
      vote_count,
      images: { backdrops },
      cast,
      crew,
    };

    // Store in cache
    cache.set(movieID, movieData);
    return { source: "live", ...movieData };
  } catch (error) {
    console.error("Scraping error:", error);
    return null;
  }
};

const getPersonInfo = async (personID) => {
  try {
    const cacheKey = `person-${personID}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return { source: "cache", ...cachedData };
    }

    const url = `https://www.adultempire.com/${personID}`;
    const { data } = await axios.get(`${proxy}${encodeURIComponent(url)}`);
    const $ = cheerio.load(data);

    const name = $('h1').text().trim();
    const biography = $('.modal-body.text-md').html();
    const profile_path = personID ? `https://imgs1cdn.adultempire.com/actors/${personID}h.jpg` : '';

    const personData = { id: personID, name, biography, profile_path };
    cache.set(cacheKey, personData);
    return { source: "live", ...personData };
  } catch (error) {
    console.error("Error getting person info:", error);
    return null;
  }
};

const getMovieCredits = async (movieID) => {
  try {
    const cachedData = cache.get(movieID);
    if (cachedData) {
      return { source: "cache", ...cachedData };
    }

    const url = `https://www.adultempire.com/${movieID}`;
    const { data } = await axios.get(`${proxy}${encodeURIComponent(url)}`);
    const $ = cheerio.load(data);

    // Extracting cast
    const cast = [];
    $(".movie-page__content-tags__performers a").each((index, element) => {
      const href = $(element).attr("href");
      const name = $(element).text().trim();

      const performerId = href ? href.split("/")[1] : "";
      const profile_path = performerId
        ? `https://imgs1cdn.adultempire.com/actors/${performerId}h.jpg`
        : "";
      cast.push({
        id: performerId,
        name,
        profile_path,
        known_for_department: "Acting",
      });
    });

    // Extracting crew
    const crew = [];
    $(".movie-page__heading__movie-info a").each((index, element) => {
      const href = $(element).attr("href");
      const name = $(element).text().trim();
      const crewId = href ? href.split("/")[1] : "";
      const profile_path = crewId
        ? `https://imgs1cdn.adultempire.com/studio/${crewId}.jpg`
        : "";

      if (crewId) {
        crew.push({
          id: crewId,
          name,
          profile_path,
          known_for_department: "Directing",
          department: "Directing",
        });
      }
    });

    // Movie data object
    const creditsData = {
      id: movieID,
      cast,
      crew,
    };

    // Store in cache
    cache.set(movieID, creditsData);
    return { source: "live", ...creditsData };
  } catch (error) {
    console.error("Scraping error:", error);
    return null;
  }
};

const getDiscoverMovies = async (page = 1) => {
  try {
    const cacheKey = `discover-movies-${page}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return { source: "cache", ...cachedData };
    }

    const url = `https://www.adultempire.com/all-dvds.html?page=${page}`;
    const { data } = await axios.get(`${proxy}${encodeURIComponent(url)}`);
    const $ = cheerio.load(data);

    const results = [];
    const total_results = $(".list-page__results strong").text().replace(/,/g, "");
    const total_pages = $(
      '.pagination li a[aria-label="Go to Last Page"]'
    )
      .text()
      .trim()
      .replace(/,/g, "");

    $(".grid-item").each((index, element) => {
      const anchorTag = $(element).find(".product-details__item-title a");
      const href = anchorTag.attr("href");
      const title = anchorTag.text().trim();

      const movieID = href ? href.split("/")[1] : "";
      const poster_path = $(element).find(".boxcover-container img").attr("src") || "";

      results.push({ id: movieID, original_title: title, poster_path, title });
    });

    const discoverData = { page, results, total_results, total_pages };
    cache.set(cacheKey, discoverData);
    return { source: "live", ...discoverData };
  } catch (error) {
    console.error("Error getting movie discover:", error);
    return null;
  }
};


// /movie?id=

// app.get("/movie", async (req, res) => {
//   const { id } = req.query;
//   if (!id) return res.status(400).json({ error: "Movie ID is required" });

//   const result = await getMovieInfo(id);
//   if (result) return res.json(result);
//   return res.status(500).json({ error: "Failed to scrape movie data" });
// });

// Route using URL parameter
app.get("/movie/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Movie ID is required" });

  const result = await getMovieInfo(id);
  if (result) return res.json(result);
  return res.status(500).json({ error: "Failed to scrape movie data" });
});

app.get("/movie/:id/credits", async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Movie ID is required" });

  const result = await getMovieCredits(id);
  if (result) return res.json(result);
  return res.status(500).json({ error: "Failed to scrape credits data" });
});

app.get("/person/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Person ID is required" });

  const result = await getPersonInfo(id);
  if (result) return res.json(result);
  return res.status(500).json({ error: "Failed to fetch person data" });
});

app.get("/discover/movie", async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page, 10) : 1;
  const result = await getDiscoverMovies(page);
  if (result) return res.json(result);
  return res.status(500).json({ error: "Failed to fetch discover movies" });
});

app.listen(3000, () => console.log("Server running on port 3000"));
