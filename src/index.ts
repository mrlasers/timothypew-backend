import * as BodyParser from "body-parser"
import * as Cors from "cors"
import * as Dotenv from "dotenv"
import * as Express from "express"

// import * as ServeStatic from "serve-static"
import { weatherRouter } from "./routes"

Dotenv.config()

const port = 7070
const openWeatherMapsKey = process.env.OPEN_WEATHER_MAPS_KEY || ""
const isDev = process.env.NODE_ENV === "development"

console.log("isDev", isDev)

const app = Express()

app.use(BodyParser.urlencoded({ extended: true }))

if (isDev) {
  console.log("enabling cors...")
  // i _really_ hate if statements; they're no good
  app.use(
    Cors({
      origin: ["http://localhost:5173"],
    })
  )
}

const staticFiles: Parameters<typeof Express.static>[] = [
  ["public/content", { extensions: ["html"], fallthrough: true }],
  ["public/styles", { extensions: ["css"] }],
  ["public/scripts", { extensions: ["js"] }],
]

staticFiles.map(([path, opts]) => app.use(Express.static(path, opts)))

// root route
app.get("/", (req: Express.Request, res: Express.Response) => {
  res.sendFile("index.html", { root: "public/content" })
  // res.redirect("index.html")
})

// contact
app.post("/contact", (req: Express.Request, res: Express.Response) => {
  // console.log(req.params)
  // res.sendFile(`${req.params.file}.html`, { root: "public" })
  console.log(req.body)
  res.redirect("/thanks.html")
})

app.get("/ping", Cors(), (req: Express.Request, res: Express.Response) =>
  res.json("pong")
)

app.use("/api/weather", weatherRouter(openWeatherMapsKey))

app.all("*", (req: Express.Request, res: Express.Response) => {
  res.redirect("/404.html")
  // res.sendFile("404.html", { root: "public/content" })
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}.`)
})
