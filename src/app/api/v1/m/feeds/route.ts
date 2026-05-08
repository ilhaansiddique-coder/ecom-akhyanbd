// Mobile re-export of the admin feeds endpoint. GET returns
// `{ data: { defaults, stats } }`; PUT updates the four shared defaults
// (brand, condition, google_product_category, site_url).
export { GET, PUT } from "@/app/api/v1/admin/feeds/route";
