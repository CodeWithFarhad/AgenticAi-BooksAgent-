export async function getRecommendedBooks(query = "bestsellers") {
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
  const randomTags = ["fantasy", "history", "mystery", "romance", "science"];
  const fullQuery = `${query} ${randomTags[Math.floor(Math.random() * randomTags.length)]}`;

  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(fullQuery)}&maxResults=10&key=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  return data.items?.map((item) => {
    const info = item.volumeInfo;
    let isbn = null;
    if (info.industryIdentifiers) {
      const isbn13 = info.industryIdentifiers.find((id: any) => id.type === "ISBN_13");
      const isbn10 = info.industryIdentifiers.find((id: any) => id.type === "ISBN_10");
      isbn = isbn13?.identifier || isbn10?.identifier || null;
    }
    let amazonLink = isbn
      ? `https://www.amazon.com/dp/${isbn}`
      : `https://www.amazon.com/s?k=${encodeURIComponent(info.title)}`;
    return {
      id: item.id,
      title: info.title,
      author: info.authors?.join(", "),
      cover: info.imageLinks?.thumbnail,
      description: info.description,
      rating: info.averageRating || 0,
      genre: info.categories?.join(", ") || "",
      publishedDate: info.publishedDate,
      isbn,
      amazonLink,
    };
  }) || [];
} 