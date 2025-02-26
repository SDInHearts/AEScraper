const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const NodeCache = require("node-cache");
const serverless = require("serverless-http");
// const cors = require("cors");
const app = express();

// Enable CORS for all origins
// app.use(cors());

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
    const backdrop_urlx = backdropPathStyle
      ? backdropPathStyle.match(/background-image:\s*url\(([^)]+)\)/)[1]
      : "";
    const backdrop_split = backdrop_urlx ? backdrop_urlx.split("/")[6] : "";
    const backdrop_path =
      backdrop_split &&
      `/${backdrop_split}`;
    const backdrop_url =
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
    const poster_url = $(".boxcover-container a").attr("data-href");
    
    const poster_path = poster_url ? `/${poster_url.split("/")[5]}` : "";

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
      const full_url = $(element).attr("data-bgsrc");
      if (full_url) {
        const file_url_split = full_url.split("/")[6] || "";
        const file_path = `/${file_url_split}`;
        const file_url = `https://caps1cdn.adultempire.com/o/1920/1080/${file_url_split}`;
        backdrops.push({ file_path, file_url });
      }
    });
    
    // Extracting similar movies
    const results = [];
    $('.row.item-grid .col-xs-4.col-sm-4.col-md-2').each((index, element) => {
        const anchor = $(element).find('a.boxcover.thumb');
        const img = anchor.find('img');

        const poster_url = img.attr('data-src');
        const title = img.attr('title');
        const href = anchor.attr('href');

        const id = href.match(/\/(\d+)\//)?.[1];

        results.push({ id, title, poster_url });
    });

    const total_results = results.length;
    const total_pages = 1; // Since we're only scraping one page
    const pages = 1; // Since we're only scraping one page

    const similar = { pages, results, total_results, total_pages };

    // Extracting cast
    const cast = [];
    $(".movie-page__content-tags__performers a").each((index, element) => {
      const href = $(element).attr("href");
      const name = $(element).text().trim();

      const performerId = href ? href.split("/")[1] : "";
      const profile_path = performerId
        ? `/${performerId}h.jpg`
        : "";
      const profile_url = performerId
        ? `https://imgs1cdn.adultempire.com/actors/${performerId}h.jpg`
        : "";
      cast.push({
        id: performerId,
        name,
        profile_path,
        profile_url,
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
        ? `/${crewId}.jpg`
        : "";
      const profile_url = crewId
        ? `https://imgs1cdn.adultempire.com/studio/${crewId}.jpg`
        : "";

      if (crewId) {
        crew.push({
          id: crewId,
          name,
          profile_path,
          profile_url,
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
      backdrop_url,
      genres,
      overview,
      poster_path,
      poster_url,
      runtime,
      vote_average,
      vote_count,
      images: { backdrops },
      similar,
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
    const profile_path = personID ? `/${personID}h.jpg` : '';
    const profile_url = personID ? `https://imgs1cdn.adultempire.com/actors/${personID}h.jpg` : '';

    const personData = { id: personID, name, biography, profile_path, profile_url };
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
        ? `/${performerId}h.jpg`
        : "";
      const profile_url = performerId
        ? `https://imgs1cdn.adultempire.com/actors/${performerId}h.jpg`
        : "";
      cast.push({
        id: performerId,
        name,
        profile_path,
        profile_url,
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
        ? `/${crewId}.jpg`
        : "";
      const profile_url = crewId
        ? `https://imgs1cdn.adultempire.com/studio/${crewId}.jpg`
        : "";

      if (crewId) {
        crew.push({
          id: crewId,
          name,
          profile_path,
          profile_url,
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
      const poster_url = $(element).find(".boxcover-container img").attr("src") || "";
      const poster_path = poster_url ? `/${poster_url.split("/")[5]}` : "";

      results.push({ id: movieID, original_title: title, poster_path, poster_url, title });
    });

    const discoverData = { page, results, total_results, total_pages };
    cache.set(cacheKey, discoverData);
    return { source: "live", ...discoverData };
  } catch (error) {
    console.error("Error getting movie discover:", error);
    return null;
  }
};

const getPopularMovies = async (page = 1) => {
  try {
    const cacheKey = `popular-movies-${page}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return { source: "cache", ...cachedData };
    }

    const url = `https://www.adultempire.com/all-dvds.html?sort=trending&page=${page}`;
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
      const poster_url = $(element).find(".boxcover-container img").attr("src") || "";
      const poster_path = poster_url ? `/${poster_url.split("/")[5]}` : "";
      const backdrop_path = poster_url ? `/${poster_url.split("/")[5]}` : "";

      results.push({ id: movieID, original_title: title, poster_path, poster_url, backdrop_path, title });
    });

    const popularData = { page, results, total_results, total_pages };
    cache.set(cacheKey, popularData);
    return { source: "live", ...popularData };
  } catch (error) {
    console.error("Error getting popular movies:", error);
    return null;
  }
};

const getPopularPersons = async (page = 1) => {
  try {
    const cacheKey = `popular-persons-${page}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return { source: "cache", ...cachedData };
    }

    const url = `https://www.adultempire.com/hottest-pornstars.html?page=${page}`;
    const { data } = await axios.get(`${proxy}${encodeURIComponent(url)}`);
    const $ = cheerio.load(data);

    const results = [];
    const total_results = $(".sub strong").text().replace(/,/g, "");
    const total_pages = $(
      '.pagination li a[aria-label="Go to Last Page"]'
    )
      .text()
      .trim()
      .replace(/,/g, "");


    $('#performerlist .col-xs-6').each((index, element) => {
        const anchor = $(element).find('a');
        const name = anchor.attr('label');
        const original_name = anchor.attr('label');
        const idMatch = anchor.attr('href').match(/\/(\d+)\//);
        const id = idMatch ? idMatch[1] : null;

        // Extracting the highest resolution poster image from <picture>
        const profile_url = $(element).find('picture source').first().attr('srcset') 
                       || $(element).find('picture img').attr('src');
        // const profile_path = profile_url ? `/${profile_url.split("/")[5]}` : "";
        const profile_path = id
        ? `/${id}h.jpg`
        : "";

        results.push({ id, name, original_name, profile_url, profile_path });
    });

    const popularPerson = { page, results, total_results, total_pages };
    cache.set(cacheKey, popularPerson);
    return { source: "live", ...popularPerson };
  } catch (error) {
    console.error("Error getting popular persons:", error);
    return null;
  }
};

const getTopRatedMovies = async (page = 1) => {
  try {
    const cacheKey = `top-rated-movies-${page}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return { source: "cache", ...cachedData };
    }

    const url = `https://www.adultempire.com/all-dvds.html?sort=bestseller_sorts&page=${page}`;
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
      const poster_url = $(element).find(".boxcover-container img").attr("src") || "";
      const poster_path = poster_url ? `/${poster_url.split("/")[5]}` : "";
      const backdrop_path = poster_url ? `/${poster_url.split("/")[5]}` : "";

      results.push({ id: movieID, original_title: title, poster_path, poster_url, backdrop_path, title });
    });

    const popularData = { page, results, total_results, total_pages };
    cache.set(cacheKey, popularData);
    return { source: "live", ...popularData };
  } catch (error) {
    console.error("Error getting top rated movies:", error);
    return null;
  }
};

const getUpcomingMovies = async (page = 1) => {
  try {
    const cacheKey = `upcoming-movies-${page}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return { source: "cache", ...cachedData };
    }

    const url = `https://www.adultempire.com/preorder-porn-movies.html?page=${page}`;
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
      const poster_url = $(element).find(".boxcover-container img").attr("src") || "";
      const poster_path = poster_url ? `/${poster_url.split("/")[5]}` : "";
      const backdrop_path = poster_url ? `/${poster_url.split("/")[5]}` : "";

      results.push({ id: movieID, original_title: title, poster_path, poster_url, backdrop_path, title });
    });

    const popularData = { page, results, total_results, total_pages };
    cache.set(cacheKey, popularData);
    return { source: "live", ...popularData };
  } catch (error) {
    console.error("Error getting upcoming movies:", error);
    return null;
  }
};


const getConfiguration = async () => {
  try {

    const images = [];

      const base_url = "https://imgs1cdn.adultempire.com/products/0";
      const secure_base_url = "https://imgs1cdn.adultempire.com/products/0";

    images.push({ base_url, secure_base_url });

    const Configuration = { images };
    return Configuration;
  } catch (error) {
    console.error("Error getting Configuration:", error);
    return null;
  }
};

const getMovieGenreList = async () => {
  try {
    const cachedData = cache.get("genre-list");
    if (cachedData) {
      return { source: "cache", ...cachedData };
    }

    const url = `https://www.adultempire.com/browse-porn-video-categories.html`;
    const { data } = await axios.get(`${proxy}${encodeURIComponent(url)}`);
    const $ = cheerio.load(data);

    // Extracting genres
    const genres = [];

    $('ul.cat-list li a').each((index, element) => {
        const href = $(element).attr('href'); // Get the href attribute
        const idMatch = href.match(/\/(\d+)\//); // Extract the numeric ID
        const id = idMatch ? idMatch[1] : null;
        const name = $(element).text().trim(); // Extract the category name

        if (id && name) {
            genres.push({ id, name });
        }
    });

    // Movie data object
    const creditsData = {
      genres,
    };

    // Store in cache
    cache.set("genre-list", creditsData);
    return { source: "live", ...creditsData };
  } catch (error) {
    console.error("Scraping error:", error);
    return null;
  }
};

const getMovieReviews = async (movieID) => {
  try {
    const cacheKey = `movie-reviews-${movieID}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return { source: "cache", ...cachedData };
    }

    const url = `https://www.adultdvdempire.com/${movieID}/load-reviews.html`;
    const { data } = await axios.get(`${proxy}${encodeURIComponent(url)}`);
    const $ = cheerio.load(data);

    const results = [];


    $(".movie-review").each((index, element) => {
        const reviewer = $(element).find("h5").text().trim().replace(/reviewed by:\s*/, "");
        const content = $(element).find("h5").next().text().trim();

        results.push({ reviewer, content });
    });

    const id = movieID;
    const total_results = results.length;
    const total_pages = '1';

    const movieReviews = { id, page, results, total_results, total_pages };
    cache.set(cacheKey, movieReviews);
    return { source: "live", ...movieReviews };
  } catch (error) {
    // console.error("Error getting movie reviews:", error);
    // return null;
    return { ...movieReviews };
  }
};

const getMovieKeywords = async (movieID) => {
  try {
    const cacheKey = `movie-keywords-${movieID}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return { source: "cache", ...cachedData };
    }

    const url = `https://www.adultempire.com/${movieID}`;
    const { data } = await axios.get(`${proxy}${encodeURIComponent(url)}`);
    const $ = cheerio.load(data);

    // Extracting keywords
    const keywords = [];
    $(".movie-page__content-tags__categories a").each((index, element) => {
      const href = $(element).attr("href");
      const name = $(element).text().trim();
      const id = href ? href.split("/")[1] : "";
      keywords.push({ id, name });
    });

    // Movie data object
    const keywordsData = {
      id: movieID,
      keywords,
    };

    // Store in cache
    cache.set(movieID, keywordsData);
    return { source: "live", ...keywordsData };
  } catch (error) {
    // console.error("Failed to get keywords data:", error);
    // return null;
    return { ...keywordsData };
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
app.get("/movie/popular", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow all domains
  const page = req.query.page ? parseInt(req.query.page, 10) : 1;
  const result = await getPopularMovies(page);
  if (result) return res.json(result);
  return res.status(500).json({ error: "Failed to fetch popular movies" });
});

app.get("/person/popular", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow all domains
  const page = req.query.page ? parseInt(req.query.page, 10) : 1;
  const result = await getPopularPersons(page);
  if (result) return res.json(result);
  return res.status(500).json({ error: "Failed to fetch popular persons" });
});

app.get("/movie/top_rated", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow all domains
  const page = req.query.page ? parseInt(req.query.page, 10) : 1;
  const result = await getTopRatedMovies(page);
  if (result) return res.json(result);
  return res.status(500).json({ error: "Failed to fetch top rated movies" });
});

app.get("/movie/upcoming", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow all domains
  const page = req.query.page ? parseInt(req.query.page, 10) : 1;
  const result = await getUpcomingMovies(page);
  if (result) return res.json(result);
  return res.status(500).json({ error: "Failed to fetch top rated movies" });
});


app.get("/movie/:id", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow all domains
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Movie ID is required" });

  const result = await getMovieInfo(id);
  if (result) return res.json(result);
  return res.status(500).json({ error: "Failed to scrape movie data" });
});

app.get("/movie/:id/reviews", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow all domains
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Movie ID is required" });

  const result = await getMovieReviews(id);
  if (result) return res.json(result);
  return res.status(500).json({ error: "Failed to scrape movie review" });
});

app.get("/movie/:id/keywords", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow all domains
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Movie ID is required" });

  const result = await getMovieKeywords(id);
  if (result) return res.json(result);
  return res.status(500).json({ error: "Failed to scrape movie keywords" });
});

app.get("/movie/:id/credits", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow all domains
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Movie ID is required" });

  const result = await getMovieCredits(id);
  if (result) return res.json(result);
  return res.status(500).json({ error: "Failed to scrape credits data" });
});

app.get("/person/:id", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow all domains
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Person ID is required" });

  const result = await getPersonInfo(id);
  if (result) return res.json(result);
  return res.status(500).json({ error: "Failed to fetch person data" });
});

app.get("/discover/movie", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow all domains
  const page = req.query.page ? parseInt(req.query.page, 10) : 1;
  const result = await getDiscoverMovies(page);
  if (result) return res.json(result);
  return res.status(500).json({ error: "Failed to fetch discover movies" });
});

app.get("/configuration", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow all domains
  const result = await getConfiguration();
  if (result) return res.json(result);
  return res.status(500).json({ error: "Failed to fetch configuration" });
});

app.get("/genre/movie/list", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow all domains
  const result = await getMovieGenreList();
  if (result) return res.json(result);
  return res.status(500).json({ error: "Failed to fetch Movie Genre List" });
});

// ** Correctly export the Express app for Netlify **
module.exports.handler = serverless(app);
