require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bodyParser = require("body-parser");
const logger = require("./utils/logger");
const validators = require("./utils/validators");

const app = express();
const PORT = process.env.PORT || 5000;

const Godown = require("./models/Godowns");
const GodownInventory = require("./models/GodownInventory");
const excelRoutes = require("./routes/excelRoutes");
const billingRoutes = require("./routes/billingRoutes");

// Middleware
// NOTE: Security middleware added below. After pulling these changes run in `backend`:
//   npm install
// This installs: helmet, express-rate-limit, express-validator, express-mongo-sanitize, xss-clean, hpp
// Adjust `authLimiter` and `generalLimiter` settings as appropriate for your deployment.
// Basic parsers
app.use(bodyParser.json());

// Hardened CORS configuration: restrict to allowed origins from environment
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:5000,http://0.0.0.0:3000,http://0.0.0.0:5000")
  .split(",")
  .map((o) => o.trim());

console.log('Allowed CORS origins:', allowedOrigins);
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (same-origin requests from served static files)
    if (!origin) {
      return callback(null, true);
    }
    // Allow requests from allowed origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy: origin not allowed"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  optionsSuccessStatus: 200,
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// HTTPS enforcement middleware (redirect HTTP to HTTPS in production)
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    // Check for X-Forwarded-Proto header (set by reverse proxy like nginx, Azure App Service)
    // or check req.secure directly (direct HTTPS connection)
    if (req.header("x-forwarded-proto") !== "https" && !req.secure) {
      logger.warn("HTTP request received; redirecting to HTTPS", {
        url: req.originalUrl,
        ip: req.ip,
      });
      return res.redirect(
        301,
        `https://${req.header("host")}${req.originalUrl}`
      );
    }
    next();
  });
}

// Security middleware
// Helmet with enhanced HSTS (HTTP Strict-Transport-Security) configuration
const helmetOptions = {
  hsts: {
    maxAge: 63072000, // 2 years in seconds
    includeSubDomains: true,
    preload: true, // allow domain to be included in HSTS preload list
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // adjust if needed
      styleSrc: ["'self'", "'unsafe-inline'"], // adjust if needed
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"], // restrict API calls to same origin
    },
  },
};
app.use(helmet(helmetOptions)); // sets secure headers
app.use(mongoSanitize()); // prevent NoSQL injection
app.use(xss()); // basic XSS sanitization
app.use(hpp()); // HTTP parameter pollution protection

// Secure cookie middleware (set secure flags on cookies)
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    // Override res.cookie to add secure flags for production
    const originalCookie = res.cookie;
    res.cookie = function (name, val, options) {
      if (!options) options = {};
      // In production, enforce secure cookies (HTTPS only), httpOnly, and SameSite
      if (process.env.NODE_ENV === "production") {
        options.secure = true; // only send over HTTPS
        options.httpOnly = true; // prevent JavaScript from accessing cookie
        options.sameSite = "Strict"; // prevent CSRF attacks
      }
      return originalCookie.call(this, name, val, options);
    };
    next();
  });
}

// Rate limiting - general (lightweight)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});
app.use(generalLimiter);

// Rate limiting for auth endpoints (stricter)
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 6, // limit each IP to 6 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later." },
});

// JWT authentication middleware
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload;
      return next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  }
  return res.status(401).json({ message: "Authorization token required" });
}

function authorizeRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== role)
      return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info("Connected to MongoDB"))
  .catch((err) => logger.error("Error connecting to MongoDB:", err));

// Schemas and Models
const itemSchema = new mongoose.Schema({
  godownId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Godown",
    required: true,
  },
  name: { type: String, required: true },
});
const Item = mongoose.model("Item", itemSchema);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
});
const User = mongoose.model("User", userSchema);

const deliveryItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  godown: { type: String, required: true },
});
const DeliveryItem = mongoose.model("DeliveryItem", deliveryItemSchema);

const saleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userName: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  godown: { type: String, required: true },
});

const Sale = mongoose.model("Sale", saleSchema);

// Schema for Select Collection
const selectSchema = new mongoose.Schema({
  inputValue: String,
});

const Select = mongoose.model("Select", selectSchema);

// Define Schema
const barcodeSchema = new mongoose.Schema({
  product: String,
  packed: String,
  batch: String,
  shift: String,
  numberOfBarcodes: Number,
  location: String,
  currentTime: String,
  rewinder: String,
  edge: String,
  winder: String,
  mixer: String,
  skuc: String,
  skun: String,
  weight: String,
  batchNumbers: [Number],
});

// Create Model
const Barcode = mongoose.model("Barcode", barcodeSchema);

// Transit Schema - for items in transit between factory and godowns
const transitSchema = new mongoose.Schema({
  inputValue: String,
  sourceLocation: { type: String, default: "Factory" }, // Where item is coming from
  destinationGodown: String, // Where item is going
  dispatchDate: { type: Date, default: Date.now },
  estimatedArrival: Date,
  status: {
    type: String,
    default: "In Transit",
    enum: ["In Transit", "Delivered", "Cancelled"],
  },
  quantity: { type: Number, default: 1 },
  notes: String,
});

const Transit = mongoose.model("Transit", transitSchema, "transits");

// Routes

const despatchSchema = new mongoose.Schema({
  selectedOption: String,
  inputValue: String,
  godownName: String, // Godown name add kiya
  addedAt: { type: Date, default: Date.now },
});

const Despatch = mongoose.model("Despatch", despatchSchema, "despatch"); // `despatch` collection

// Schema for Select Collection

const delevery1Schema = new mongoose.Schema({
  selectedOption: String,
  inputValue: String,
  godownName: String,
  addedAt: { type: Date, default: Date.now },
  // Additional fields for billing system integration
  itemName: String,
  quantity: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  masterPrice: { type: Number, default: 0 },
  description: String,
  category: String,
  godownId: { type: mongoose.Schema.Types.ObjectId, ref: "Godown" },
  lastUpdated: { type: Date, default: Date.now },
});

const Delevery1 = mongoose.model("Delevery1", delevery1Schema, "delevery1");

const dsaleSchema = new mongoose.Schema({
  selectedOption: String,
  inputValue: String,
  godownName: String,
  username: String, // Added username
  mobileNumber: String, // Added mobile number
  addedAt: { type: Date, default: Date.now },
});

// Define Models

const Dsale = mongoose.model("Dsale", dsaleSchema, "dsale");

// API Routes

//const barcodeSchema = new mongoose.Schema({}, { strict: false });
//const Barcode = mongoose.model("Barcode", barcodeSchema);

app.get("/api/barcodes", async (req, res) => {
  try {
    const barcodes = await Barcode.find();
    res.json(barcodes);
  } catch (error) {
    logger.error("Error fetching barcodes:", error);
    res.status(500).json({ message: "Error fetching data" });
  }
});

// API: Get product details by barcode number
app.get("/api/product-details/:barcode", async (req, res) => {
  try {
    const { barcode } = req.params;
    logger.info("Fetching product details for barcode:", barcode);

    // Find the barcode in the database
    // The barcode format is: skuc + batchNumber (e.g., "SKU0011" = "SKU001" + "1")
    const allBarcodes = await Barcode.find();

    let foundProduct = null;

    for (const barcodeDoc of allBarcodes) {
      if (barcodeDoc.batchNumbers && Array.isArray(barcodeDoc.batchNumbers)) {
        for (const bn of barcodeDoc.batchNumbers) {
          const fullBarcode = String(barcodeDoc.skuc) + String(bn);
          if (fullBarcode === barcode) {
            foundProduct = {
              product: barcodeDoc.product || "Unknown Product",
              skuName: barcodeDoc.skun || "",
              packed: barcodeDoc.packed || "",
              batch: barcodeDoc.batch || "",
              weight: barcodeDoc.weight || "",
              shift: barcodeDoc.shift || "",
              location: barcodeDoc.location || "",
              currentTime: barcodeDoc.currentTime || "",
              rewinder: barcodeDoc.rewinder || "",
              edge: barcodeDoc.edge || "",
              winder: barcodeDoc.winder || "",
              mixer: barcodeDoc.mixer || "",
              skuc: barcodeDoc.skuc || "",
              barcodeNumber: fullBarcode,
            };
            break;
          }
        }
      }
      if (foundProduct) break;
    }

    if (foundProduct) {
      res.json({
        success: true,
        data: foundProduct,
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
  } catch (error) {
    logger.error("Error fetching product details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching product details",
    });
  }
});

// Godown API
app.get("/api/godowns", async (req, res) => {
  try {
    const godowns = await Godown.find();
    res.json(godowns);
  } catch (error) {
    logger.error("Error fetching godowns:", error);
    res.status(500).json({ message: "Error fetching godowns" });
  }
});

// Get single godown by ID
app.get("/api/godowns/:id", async (req, res) => {
  try {
    const godown = await Godown.findById(req.params.id);
    if (!godown) {
      return res.status(404).json({ message: "Godown not found" });
    }
    res.json(godown);
  } catch (error) {
    logger.error("Error fetching godown by ID:", error);
    res.status(500).json({ message: "Error fetching godown" });
  }
});

app.post(
  "/api/godowns",
  validators.rejectUnknownFields([
    "name",
    "address",
    "email",
    "password",
    "city",
    "state",
  ]),
  [
    validators.string("name", 200),
    validators.string("address", 500),
    validators.email(),
    validators.password(),
    validators.string("city", 100),
    validators.string("state", 100),
  ],
  validators.handleValidationErrors,
  async (req, res) => {
    try {
      const { name, address, email, password, city, state } = req.body;
      // Hash password before saving
      let hashedPassword = undefined;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }
      const godown = new Godown({
        name,
        address,
        email,
        password: hashedPassword,
        city,
        state,
      });
      const savedGodown = await godown.save();
      res.status(201).json(savedGodown);
    } catch (error) {
      if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
        return res
          .status(400)
          .json({ message: "Email already exists (duplicate)" });
      }
      logger.error("Error creating/updating godown:", error);
      res.status(400).json({ message: "Invalid godown data" });
    }
  }
);

// Add PUT endpoint for editing godown
app.put(
  "/api/godowns/:id",
  validators.rejectUnknownFields([
    "name",
    "address",
    "email",
    "password",
    "city",
    "state",
  ]),
  [
    validators.string("name", 200),
    validators.string("address", 500),
    validators.email(),
    body("password").optional().isString().isLength({ min: 6 }),
    validators.string("city", 100),
    validators.string("state", 100),
  ],
  validators.handleValidationErrors,
  async (req, res) => {
    try {
      const { name, address, email, password, city, state } = req.body;
      // Build update object and hash password only if provided
      const update = { name, address, email, city, state };
      if (password) {
        update.password = await bcrypt.hash(password, 10);
      }
      const updatedGodown = await Godown.findByIdAndUpdate(
        req.params.id,
        update,
        { new: true, runValidators: true }
      );
      if (!updatedGodown)
        return res.status(404).json({ message: "Godown not found" });
      res.json(updatedGodown);
    } catch (error) {
      if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
        return res
          .status(400)
          .json({ message: "Email already exists (duplicate)" });
      }
      logger.error("Error updating godown:", error);
      res.status(400).json({ message: "Invalid godown data" });
    }
  }
);

app.delete("/api/godowns/:id", async (req, res) => {
  try {
    const godown = await Godown.findByIdAndDelete(req.params.id);
    if (!godown) return res.status(404).json({ message: "Godown not found" });
    res.json({ message: "Godown deleted successfully" });
  } catch (error) {
    logger.error("Error deleting godown:", error);
    res.status(500).json({ message: "Server error" });
  }
});
//5

// Godown Inventory API Endpoints are now in billingRoutes.js

// Item API
app.get("/api/items/:godownId", async (req, res) => {
  try {
    const items = await Item.find({ godownId: req.params.godownId });
    res.json(items);
  } catch (error) {
    logger.error("Error fetching items:", error);
    res.status(500).json({ message: "Error fetching items" });
  }
});
//6
app.post(
  "/api/items",
  validators.rejectUnknownFields(["godownId", "name"]),
  [validators.objectId("godownId"), validators.string("name", 500)],
  validators.handleValidationErrors,
  async (req, res) => {
    try {
      const { godownId, name } = req.body;
      const item = new Item({ godownId, name });
      const savedItem = await item.save();
      res.status(201).json(savedItem);
    } catch (error) {
      logger.error("Error creating item:", error);
      res.status(400).json({ message: "Invalid item data" });
    }
  }
);
//7

// Delivery Items API
app.post(
  "/api/checkAndAddItem",
  validators.rejectUnknownFields(["input", "godownName"]),
  [validators.string("input", 500), validators.string("godownName", 200)],
  validators.handleValidationErrors,
  async (req, res) => {
    const { input, godownName } = req.body;

    try {
      const item = await Item.findOne({ name: input });

      if (item) {
        const newDeliveryItem = new DeliveryItem({
          name: input,
          godown: godownName,
        });
        await newDeliveryItem.save();
        res.json({ success: true, message: "Item added successfully!" });
      } else {
        res.json({
          success: false,
          message: "No matching item found in the database.",
        });
      }
    } catch (error) {
      logger.error("Error in checkAndAddItem API:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred. Please try again.",
      });
    }
  }
);
//8

app.get("/api/getDeliveryItems", async (req, res) => {
  const godownName = req.query.godown;

  if (!godownName) {
    return res
      .status(400)
      .json({ success: false, message: "Godown name is required." });
  }

  try {
    const deliveryItems = await DeliveryItem.find({ godown: godownName });

    if (deliveryItems.length === 0) {
      return res.json({
        success: false,
        message: "No delivery items found for this godown.",
      });
    }

    res.json({ success: true, data: deliveryItems });
  } catch (error) {
    logger.error("Error fetching delivery items:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching data.",
    });
  }
});
//9

// User Authentication API
app.post(
  "/api/auth/signup",
  validators.rejectUnknownFields(["username", "email", "password"]),
  [
    validators.string("username", 100),
    validators.email(),
    validators.password(),
  ],
  validators.handleValidationErrors,
  async (req, res) => {
    const { username, email, password } = req.body;
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser)
        return res.status(400).json({ message: "User already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ username, email, password: hashedPassword });
      await newUser.save();
      res.status(201).json({ message: "User created successfully" });
    } catch (error) {
      logger.error("Error during signup:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

//10

app.post(
  "/api/auth/login",
  authLimiter,
  [
    body("email").isEmail().withMessage("Invalid email").normalizeEmail(),
    body("password")
      .isString()
      .isLength({ min: 6 })
      .withMessage("Invalid password"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Auth login validation failed", { errors: errors.array() });
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(400).json({ message: "Invalid credentials" });

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res.json({ token });
    } catch (error) {
      logger.error("Error during auth login", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Admin Login Route
app.post(
  "/loginadmin",
  authLimiter,
  [
    body("username").isString().trim().notEmpty(),
    body("password").isString().notEmpty(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Admin login validation failed", { errors: errors.array() });
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    const { username, password } = req.body;
    if (
      username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      if (!process.env.JWT_SECRET) {
        logger.error("JWT secret missing for admin login");
        return res.status(500).json({ message: "Server configuration error" });
      }
      const token = jwt.sign(
        { role: "admin", username },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
      return res.json({ success: true, token });
    }
    logger.warn("Invalid admin login attempt", { username });
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }
);

// Godown Login Validation
app.post(
  "/api/login",
  validators.rejectUnknownFields(["name", "address"]),
  [validators.string("name", 200), validators.string("address", 500)],
  validators.handleValidationErrors,
  async (req, res) => {
    const { name, address } = req.body;
    try {
      const godown = await Godown.findOne({ name, address });
      if (godown) {
        res.json({ success: true, message: "Login successful" });
      } else {
        res.json({ success: false, message: "Invalid Godown Name or Address" });
      }
    } catch (err) {
      logger.error("Error in godown login by name/address:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Godown Login with Email and Password
app.post(
  "/api/godown-login",
  authLimiter,
  [
    body("email").isEmail().withMessage("Invalid email").normalizeEmail(),
    body("password")
      .isString()
      .isLength({ min: 6 })
      .withMessage("Invalid password"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Godown login validation failed", { errors: errors.array() });
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    const { email, password } = req.body;
    try {
      const godown = await Godown.findOne({ email });
      if (!godown)
        return res.json({
          success: false,
          message: "Invalid Email or Password",
        });

      const isMatch = await bcrypt.compare(password, godown.password);
      if (!isMatch)
        return res.json({
          success: false,
          message: "Invalid Email or Password",
        });

      res.json({
        success: true,
        message: "Login successful",
        godown: {
          _id: godown._id,
          name: godown.name,
          address: godown.address,
          email: godown.email,
          city: godown.city,
          state: godown.state,
        },
      });
    } catch (err) {
      logger.error("Error in godown email login:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// User List API (protected - admin only)
app.get(
  "/api/users",
  authenticateJWT,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const users = await User.find().select("-password");
      res.json(users);
    } catch (error) {
      logger.error("Error fetching users:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// User Deletion API (protected - admin only)
app.delete(
  "/api/users/:id",
  authenticateJWT,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      logger.error("Error deleting user:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// User Password Change API (protected - admin only)
app.put(
  "/api/users/:id/password",
  authenticateJWT,
  authorizeRole("admin"),
  [
    body("password")
      .isString()
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array()
      });
    }

    try {
      const { password } = req.body;
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
      await user.save();

      logger.info(`Password changed for user: ${user.username} by admin`);
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      logger.error("Error changing user password:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get all delivery items
app.get("/api/deliveryItems", async (req, res) => {
  try {
    const items = await DeliveryItem.find();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: "Error fetching delivery items" });
  }
});

// Add item to sales if it matches deliveryItems
app.post(
  "/api/sales",
  validators.rejectUnknownFields([
    "name",
    "userName",
    "mobileNumber",
    "godown",
  ]),
  [
    validators.string("name", 500),
    validators.string("userName", 200),
    validators.phone("mobileNumber"),
    validators.string("godown", 200),
  ],
  validators.handleValidationErrors,
  async (req, res) => {
    const { name, userName, mobileNumber, godown } = req.body;

    try {
      // Check if the item exists in the deliveryItems collection
      const matchingItem = await DeliveryItem.findOne({ name: name.trim() });

      if (!matchingItem) {
        return res
          .status(400)
          .json({ error: "Item name does not exist in delivery items." });
      }

      // Add the item to the sales collection
      const sale = new Sale({ name, userName, mobileNumber, godown });
      await sale.save();

      // Delete the item from the deliveryItems collection
      await DeliveryItem.findByIdAndDelete(matchingItem._id);

      res.status(201).json(sale);
    } catch (error) {
      logger.error("Error processing sale:", error);
      res.status(500).json({ error: "Error processing the sale" });
    }
  }
);

// Delete item from delivery items
app.delete("/api/deliveryItems/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await DeliveryItem.findByIdAndDelete(id);
    res.status(200).json({ message: "Item deleted from delivery items" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting item from delivery items" });
  }
});

// Get all sales grouped by godown
app.get("/api/sales", async (req, res) => {
  try {
    const salesData = await Sale.aggregate([
      { $group: { _id: "$godown", sales: { $push: "$$ROOT" } } },
    ]);
    res.status(200).json(salesData);
  } catch (error) {
    res.status(500).json({ error: "Error fetching sales data" });
  }
});

// Routes

// Get All Data from 'datas' collection
app.get("/selects", async (req, res) => {
  try {
    const data = await Select.find();
    res.json(data);
  } catch (err) {
    res.status(500).send("Error fetching data");
  }
});

// API to fetch unique products for dropdown
app.get("/api/products", async (req, res) => {
  try {
    const products = await Barcode.distinct("product"); // Unique products only
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products" });
  }
});

// API to save input field data in 'select' collection
app.post(
  "/api/save",
  validators.rejectUnknownFields(["inputValue"]),
  [validators.string("inputValue", 500)],
  validators.handleValidationErrors,
  async (req, res) => {
    try {
      const { inputValue } = req.body;
      const newEntry = new Select({ inputValue });
      await newEntry.save();
      res.json({ message: "Data saved successfully" });
    } catch (error) {
      logger.error("Error saving data:", error);
      res.status(500).json({ message: "Error saving data" });
    }
  }
);

// API to save only input value (for SelectForm) - now same as /api/save
app.post(
  "/api/save-input",
  validators.rejectUnknownFields(["inputValue"]),
  [validators.string("inputValue", 500)],
  validators.handleValidationErrors,
  async (req, res) => {
    try {
      const { inputValue } = req.body;
      const newEntry = new Select({ inputValue });
      await newEntry.save();
      res.json({ message: "Data saved successfully" });
    } catch (error) {
      logger.error("Error saving input:", error);
      res.status(500).json({ message: "Error saving data" });
    }
  }
);

// API: Get product details by barcode
app.get("/api/product-details/:barcode", async (req, res) => {
  try {
    const { barcode } = req.params;

    // Find the barcode in the database
    const barcodeData = await Barcode.findOne({
      $expr: {
        $and: [
          { $ne: ["$skuc", null] },
          { $ne: ["$skuc", ""] },
          {
            $in: [
              {
                $toInt: {
                  $substr: [
                    barcode,
                    { $strLenCP: "$skuc" },
                    { $subtract: [{ $strLenCP: barcode }, { $strLenCP: "$skuc" }] }
                  ]
                }
              },
              "$batchNumbers"
            ]
          },
          {
            $eq: [
              { $substr: [barcode, 0, { $strLenCP: "$skuc" }] },
              "$skuc"
            ]
          }
        ]
      }
    });

    if (!barcodeData) {
      return res.json({
        success: false,
        message: "Product not found"
      });
    }

    res.json({
      success: true,
      data: {
        product: barcodeData.product || "N/A",
        skuName: barcodeData.skun || "N/A",
        weight: barcodeData.weight || "N/A",
        packed: barcodeData.packed || "N/A",
        batch: barcodeData.batch || "N/A",
        shift: barcodeData.shift || "N/A",
        location: barcodeData.location || "N/A",
        currentTime: barcodeData.currentTime || "N/A",
        rewinder: barcodeData.rewinder || "N/A",
        edge: barcodeData.edge || "N/A",
        winder: barcodeData.winder || "N/A",
        mixer: barcodeData.mixer || "N/A",
      }
    });
  } catch (error) {
    logger.error("Error fetching product details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching product details"
    });
  }
});

// API: Get All Select Options
app.get("/api/products1", async (req, res) => {
  try {
    const products = await Select.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// API: Add Data After Checking Match & Delete from `selects`
app.post(
  "/api/save/select",
  validators.rejectUnknownFields(["inputValue", "godownName"]),
  [validators.string("inputValue", 500), validators.string("godownName", 200)],
  validators.handleValidationErrors,
  async (req, res) => {
    const { inputValue, godownName } = req.body;

    try {
      const existingData = await Select.findOne({ inputValue });

      if (!existingData) {
        return res
          .status(400)
          .json({ message: "No matching data found in selects" });
      }

      // Save to `despatch` collection with godown name
      const newDespatch = new Despatch({
        selectedOption: "default",
        inputValue,
        godownName,
      });
      await newDespatch.save();

      // Add to Transit tracking
      const transitItem = new Transit({
        inputValue,
        sourceLocation: "Factory",
        destinationGodown: godownName,
        quantity: 1,
        status: "In Transit",
      });
      await transitItem.save();
      logger.info("Item added to transit tracking", { inputValue, godownName });

      // Delete from `selects` collection after adding
      await Select.deleteOne({ _id: existingData._id });

      res.json({ message: "Data saved in despatch and deleted from selects" });
    } catch (error) {
      logger.error("Error saving data from selects->despatch:", error);
      res.status(500).json({ message: "Error saving data" });
    }
  }
);

// Transit API Endpoints

// Get all transit items
app.get("/api/transits", async (req, res) => {
  try {
    const transitItems = await Transit.find({ status: "In Transit" }).sort({
      dispatchDate: -1,
    });
    res.json(transitItems);
  } catch (error) {
    logger.error("Error fetching transit items:", error);
    res.status(500).json({ message: "Error fetching transit items" });
  }
});

// Get transit summary
app.get("/api/transits/summary", async (req, res) => {
  try {
    const transitItems = await Transit.find({ status: "In Transit" });
    const totalInTransit = transitItems.length;

    // Group by godown
    const byGodown = {};
    transitItems.forEach((item) => {
      const godownName = item.destinationGodown || "Unknown";
      if (!byGodown[godownName]) {
        byGodown[godownName] = {
          godownName,
          itemCount: 0,
        };
      }
      byGodown[godownName].itemCount += 1;
    });

    res.json({
      totalInTransit,
      byGodown: Object.values(byGodown),
    });
  } catch (error) {
    logger.error("Error fetching transit summary:", error);
    res.status(500).json({ message: "Error fetching transit summary" });
  }
});

// Update transit status
app.put(
  "/api/transits/:id/status",
  validators.rejectUnknownFields(["status"]),
  [body("status").isIn(["In Transit", "Delivered", "Cancelled"])],
  validators.handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const transitItem = await Transit.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );

      if (!transitItem) {
        return res.status(404).json({ message: "Transit item not found" });
      }

      logger.info("Transit status updated", { id, status });
      res.json({ message: "Status updated successfully", item: transitItem });
    } catch (error) {
      logger.error("Error updating transit status:", error);
      res.status(500).json({ message: "Error updating status" });
    }
  }
);

// API to save data
app.post(
  "/api/saved",
  validators.rejectUnknownFields([
    "product",
    "packed",
    "batch",
    "shift",
    "numberOfBarcodes",
    "location",
    "currentTime",
    "rewinder",
    "edge",
    "winder",
    "mixer",
    "skuc",
    "skun",
    "weight",
    "batchNumbers",
  ]),
  [
    body("product").optional().isString().trim(),
    body("packed").optional().isString().trim(),
    body("batch").optional().isString().trim(),
    body("shift").optional().isString().trim(),
    body("numberOfBarcodes").optional().isInt(),
    body("location").optional().isString().trim(),
    body("currentTime").optional().isString().trim(),
    body("rewinder").optional().isString().trim(),
    body("edge").optional().isString().trim(),
    body("winder").optional().isString().trim(),
    body("mixer").optional().isString().trim(),
    body("skuc").optional().isString().trim(),
    body("skun").optional().isString().trim(),
    body("weight").optional().isString().trim(),
    body("batchNumbers").optional().isArray(),
  ],
  validators.handleValidationErrors,
  async (req, res) => {
    try {
      const newBarcode = new Barcode(req.body);
      await newBarcode.save();
      res.json({ message: "Data saved successfully!" });
    } catch (error) {
      logger.error("Error saving barcode data:", error);
      res.status(500).json({ message: "Error saving data" });
    }
  }
);

// API: Get product details by barcode
app.get("/api/product-details/:barcode", async (req, res) => {
  try {
    const { barcode } = req.params;
    logger.info("Fetching product details for barcode:", barcode);

    // Get all barcodes and search through them
    const allBarcodes = await Barcode.find();

    let foundProduct = null;

    for (const barcodeData of allBarcodes) {
      if (barcodeData.skuc && barcodeData.batchNumbers && Array.isArray(barcodeData.batchNumbers)) {
        // Check if the scanned barcode matches any of the generated barcodes
        for (const batchNum of barcodeData.batchNumbers) {
          const fullBarcode = String(barcodeData.skuc) + String(batchNum);
          if (fullBarcode === barcode) {
            foundProduct = barcodeData;
            break;
          }
        }
      }
      if (foundProduct) break;
    }

    if (!foundProduct) {
      logger.warn("Product not found for barcode:", barcode);
      return res.json({
        success: false,
        message: "Product not found"
      });
    }

    logger.info("Product found:", foundProduct.product);
    res.json({
      success: true,
      data: {
        product: foundProduct.product || "N/A",
        skuName: foundProduct.skun || "N/A",
        weight: foundProduct.weight || "N/A",
        packed: foundProduct.packed || "N/A",
        batch: foundProduct.batch || "N/A",
        shift: foundProduct.shift || "N/A",
        location: foundProduct.location || "N/A",
        currentTime: foundProduct.currentTime || "N/A",
        rewinder: foundProduct.rewinder || "N/A",
        edge: foundProduct.edge || "N/A",
        winder: foundProduct.winder || "N/A",
        mixer: foundProduct.mixer || "N/A",
      }
    });
  } catch (error) {
    logger.error("Error fetching product details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching product details"
    });
  }
});

// API: Get All Despatch Options
app.get("/api/products2", async (req, res) => {
  try {
    const products = await Despatch.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// API: Add Data After Checking Match & Delete from `despatch`
app.post(
  "/api/save/despatch",
  validators.rejectUnknownFields([
    "selectedOption",
    "inputValue",
    "godownName",
  ]),
  [
    validators.string("selectedOption", 100),
    validators.string("inputValue", 500),
    validators.string("godownName", 200),
  ],
  validators.handleValidationErrors,
  async (req, res) => {
    const { selectedOption, inputValue, godownName } = req.body;

    try {
      const existingData = await Despatch.findOne({
        selectedOption,
        inputValue,
      });

      if (!existingData) {
        return res
          .status(400)
          .json({ message: "No matching data found in despatch" });
      }

      // Save to `delevery1` collection with godown name
      const newDelevery1 = new Delevery1({
        selectedOption,
        inputValue,
        godownName,
      });
      await newDelevery1.save();

      // Delete from `despatch` collection after adding
      await Despatch.deleteOne({ _id: existingData._id });

      res.json({
        message: "Data saved in delevery1 and deleted from despatch",
      });
    } catch (error) {
      logger.error("Error saving despatch->delevery1 data:", error);
      res.status(500).json({ message: "Error saving data" });
    }
  }
);

// API Route to get data
app.get("/api/despatch", async (req, res) => {
  try {
    const data = await Despatch.find({});
    logger.debug("Despatch data fetched:", { count: data.length });
    res.json(data);
  } catch (err) {
    logger.error("Error fetching despatch data:", err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// API to fetch data from delevery1 Collection
app.get("/api/delevery1", async (req, res) => {
  try {
    const data = await Delevery1.find();
    res.json(data);
  } catch (error) {
    logger.error("Error fetching delevery1 data:", error);
    res.status(500).json({ message: "Error fetching data" });
  }
});

// API: Get All Data from `delevery1`
app.get("/api/products3", async (req, res) => {
  try {
    const products = await Delevery1.find(); // Fetching from `delevery1`
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// API: Add Data to `delevery1`
app.post(
  "/api/add/delevery1",
  validators.rejectUnknownFields([
    "selectedOption",
    "inputValue",
    "godownName",
    "username",
    "mobileNumber",
  ]),
  [
    validators.string("selectedOption", 100),
    validators.string("inputValue", 500),
    validators.string("godownName", 200),
    body("username").optional().isString().trim(),
    body("mobileNumber")
      .optional()
      .matches(/^[0-9\s\-\+\(\)]+$/),
  ],
  validators.handleValidationErrors,
  async (req, res) => {
    const { selectedOption, inputValue, godownName, username, mobileNumber } =
      req.body;
    logger.debug("Add delevery1 request:", {
      selectedOption,
      inputValue,
      godownName,
    });

    try {
      const newDelevery1 = new Delevery1({
        selectedOption,
        inputValue,
        godownName,
        username,
        mobileNumber,
      });
      await newDelevery1.save();
      res.json({ message: "Data added to delevery1" });
    } catch (error) {
      logger.error("Error adding delevery1 data:", error);
      res.status(500).json({ message: "Error adding data" });
    }
  }
);

// API: Add Data After Checking Match & Delete from `delevery1`
app.post(
  "/api/save/delevery1",
  validators.rejectUnknownFields([
    "selectedOption",
    "inputValue",
    "godownName",
    "username",
    "mobileNumber",
  ]),
  [
    validators.string("selectedOption", 100),
    validators.string("inputValue", 500),
    validators.string("godownName", 200),
    body("username").optional().isString().trim(),
    body("mobileNumber")
      .optional()
      .matches(/^[0-9\s\-\+\(\)]+$/),
  ],
  validators.handleValidationErrors,
  async (req, res) => {
    const { selectedOption, inputValue, godownName, username, mobileNumber } =
      req.body;

    try {
      // Check if matching data exists in `delevery1`
      const existingData = await Delevery1.findOne({
        selectedOption,
        inputValue,
      });

      if (!existingData) {
        return res
          .status(400)
          .json({ message: "No matching data found in delevery1" });
      }

      // Save to `dsale` collection with godown name, username, and mobile number
      const newDsale = new Dsale({
        selectedOption,
        inputValue,
        godownName,
        username,
        mobileNumber,
      });
      await newDsale.save();

      // Delete from `delevery1` collection after adding to `dsale`
      await Delevery1.deleteOne({ _id: existingData._id });

      res.json({ message: "Data saved in dsale and deleted from delevery1" });
    } catch (error) {
      logger.error("Error saving to delevery1/dsale:", error);
      res.status(500).json({ message: "Error saving data" });
    }
  }
);

// Get all data
app.get("/api/data", async (req, res) => {
  try {
    const data = await Dsale.find();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

// API to save multiple select + input field data in 'select' collection
app.post(
  "/api/save-multiple",
  validators.rejectUnknownFields(["selectedOption", "values"]),
  [
    validators.string("selectedOption", 200),
    body("values")
      .isArray({ min: 1 })
      .withMessage("Values must be a non-empty array"),
  ],
  validators.handleValidationErrors,
  async (req, res) => {
    try {
      const { selectedOption, values } = req.body;
      // Validate each value is a string
      if (!values.every((v) => typeof v === "string" && v.trim().length > 0)) {
        return res.status(400).json({
          message: "Validation failed",
          errors: [
            {
              field: "values",
              message: "All values must be non-empty strings",
            },
          ],
        });
      }
      // Save all values
      const entries = values.map((inputValue) => ({
        selectedOption,
        inputValue,
      }));
      await Select.insertMany(entries);
      res.json({ message: "All values saved successfully" });
    } catch (error) {
      logger.error("Error saving multiple select values:", error);
      res.status(500).json({ message: "Error saving values" });
    }
  }
);

// ==================== COMPREHENSIVE INVENTORY TRACKING ====================

app.get("/api/inventory/comprehensive-summary", async (req, res) => {
  try {
    logger.info("Fetching comprehensive inventory summary");

    const godowns = await Godown.find();
    const godownInventories = await GodownInventory.find().populate(
      "godownId",
      "name"
    );
    const factoryItems = await Select.find();
    const inTransitItems = await Delevery1.find();
    const allBarcodes = await Barcode.find(); // Fetch barcodes for name resolution

    // Create a lookup map: SKU/Code -> Product Name
    const productLookup = new Map();
    allBarcodes.forEach(b => {
      if (b.skuc) productLookup.set(b.skuc.toLowerCase(), b.product);
      if (b.skun) productLookup.set(b.skun.toLowerCase(), b.product);
      // Also map the product name to itself to handle cases where we already have the name
      if (b.product) productLookup.set(b.product.toLowerCase(), b.product);
    });

    // Helper function to resolve product name
    const resolveProductName = (input) => {
      if (!input) return "Unknown";
      const lowerInput = input.toLowerCase();

      // 1. Direct match
      if (productLookup.has(lowerInput)) return productLookup.get(lowerInput);

      // 2. Check if input starts with any known SKU (Barcode logic)
      for (const [code, name] of productLookup.entries()) {
        if (lowerInput.startsWith(code)) return name;
      }

      // 3. Fallback: If input looks like a barcode (SKU + Batch), try to extract SKU
      // This is heuristic. If we can't find a name, return the input itself (or truncated if too long)
      return input;
    };

    // Aggregate data by Product Name
    const inventoryMap = new Map();

    const updateInventory = (name, type, godownName = null, qty = 1) => {
      const productName = name || "Unknown";

      if (!inventoryMap.has(productName)) {
        inventoryMap.set(productName, {
          itemName: productName,
          factoryInventory: 0,
          inTransit: 0,
          totalQuantity: 0,
          godowns: {},
        });
      }

      const entry = inventoryMap.get(productName);
      entry.totalQuantity += qty;

      if (type === 'factory') entry.factoryInventory += qty;
      else if (type === 'transit') entry.inTransit += qty;
      else if (type === 'godown' && godownName) {
        if (!entry.godowns[godownName]) entry.godowns[godownName] = 0;
        entry.godowns[godownName] += qty;
      }
    };

    // Process factory items (Select collection)
    factoryItems.forEach((item) => {
      const resolvedName = resolveProductName(item.inputValue);
      updateInventory(resolvedName, 'factory');
    });

    // Process in-transit items (Delevery1 collection)
    inTransitItems.forEach((item) => {
      // Prefer itemName if available, else resolve from inputValue
      const name = item.itemName || resolveProductName(item.inputValue);
      updateInventory(name, 'transit');
    });

    // Process godown inventories
    godownInventories.forEach((item) => {
      const godownName = item.godownId ? item.godownId.name : "Unknown";
      // GodownInventory usually has the real itemName
      updateInventory(item.itemName, 'godown', godownName, item.quantity);
    });

    // Convert map to array and sort
    const inventorySummary = Array.from(inventoryMap.values()).sort((a, b) =>
      a.itemName.localeCompare(b.itemName)
    );

    // Get list of all godown names
    const godownNames = godowns.map((g) => g.name).sort();

    res.json({
      inventory: inventorySummary,
      godownNames: godownNames,
      summary: {
        totalItems: inventorySummary.length,
        totalQuantity: inventorySummary.reduce((sum, item) => sum + item.totalQuantity, 0),
        totalFactory: inventorySummary.reduce((sum, item) => sum + item.factoryInventory, 0),
        totalInTransit: inventorySummary.reduce((sum, item) => sum + item.inTransit, 0),
      },
    });
  } catch (error) {
    logger.error("Error fetching comprehensive inventory summary:", error);
    res
      .status(500)
      .json({ message: "Error fetching inventory data", error: error.message });
  }
});

// ==================== BARCODE UNIQUENESS VALIDATION ====================

// API: Check if barcode numbers already exist
app.post("/api/barcodes/check-uniqueness", async (req, res) => {
  try {
    const { barcodeNumbers } = req.body;

    if (!barcodeNumbers || !Array.isArray(barcodeNumbers)) {
      return res
        .status(400)
        .json({ message: "Invalid request: barcodeNumbers array required" });
    }

    logger.info("Checking barcode uniqueness for:", barcodeNumbers);

    // Extract numeric parts from barcode strings (e.g., "SKU0021" -> 21)
    const numericBarcodes = barcodeNumbers
      .map((barcode) => {
        const match = String(barcode).match(/\d+$/); // Get trailing numbers
        return match ? parseInt(match[0]) : null;
      })
      .filter((num) => num !== null);

    logger.info("Extracted numeric barcodes:", numericBarcodes);

    // Check in Barcode collection (uses numeric batchNumbers)
    const existingBarcodes = await Barcode.find({
      batchNumbers: { $in: numericBarcodes },
    });

    // Check in Select collection (factory inventory) - uses full string
    const existingInSelect = await Select.find({
      inputValue: { $in: barcodeNumbers },
    });

    // Check in Delevery1 collection (in transit) - uses full string
    const existingInDelevery = await Delevery1.find({
      inputValue: { $in: barcodeNumbers },
    });

    // Check in Despatch collection - uses full string
    const existingInDespatch = await Despatch.find({
      inputValue: { $in: barcodeNumbers },
    });

    const duplicates = new Set();

    // Add duplicates from Barcode collection (reconstruct full barcode string)
    existingBarcodes.forEach((barcode) => {
      if (barcode.batchNumbers && barcode.skuc) {
        barcode.batchNumbers.forEach((num) => {
          const fullBarcode = `${barcode.skuc}${num}`;
          // Check if this matches any of the requested barcodes
          if (barcodeNumbers.includes(fullBarcode)) {
            duplicates.add(fullBarcode);
          }
        });
      }
    });

    existingInSelect.forEach((item) => duplicates.add(item.inputValue));
    existingInDelevery.forEach((item) => duplicates.add(item.inputValue));
    existingInDespatch.forEach((item) => duplicates.add(item.inputValue));

    const duplicatesList = Array.from(duplicates);

    logger.info("Duplicates found:", duplicatesList);

    res.json({
      isUnique: duplicatesList.length === 0,
      duplicates: duplicatesList,
      message:
        duplicatesList.length > 0
          ? `Found ${duplicatesList.length} duplicate barcode(s)`
          : "All barcodes are unique",
    });
  } catch (error) {
    logger.error("Error checking barcode uniqueness:", error);
    logger.error("Error details:", error.message);
    logger.error("Stack trace:", error.stack);
    res.status(500).json({
      message: "Error checking barcode uniqueness",
      error: error.message
    });
  }
});

// ==================== TRANSIT TRACKING ====================

// API: Get all transit items
app.get("/api/transits", async (req, res) => {
  try {
    const transits = await Transit.find({ status: "In Transit" }).sort({
      dispatchDate: -1,
    });
    res.json(transits);
  } catch (error) {
    logger.error("Error fetching transit items:", error);
    res.status(500).json({ message: "Error fetching transit items" });
  }
});

// API: Get transit items by destination godown
app.get("/api/transits/godown/:godownName", async (req, res) => {
  try {
    const { godownName } = req.params;
    const transits = await Transit.find({
      destinationGodown: godownName,
      status: "In Transit",
    }).sort({ dispatchDate: -1 });
    res.json(transits);
  } catch (error) {
    logger.error("Error fetching transit items for godown:", error);
    res.status(500).json({ message: "Error fetching transit items" });
  }
});

// API: Add item to transit
app.post(
  "/api/transits/add",
  validators.rejectUnknownFields([
    "inputValue",
    "sourceLocation",
    "destinationGodown",
    "estimatedArrival",
    "quantity",
    "notes",
  ]),
  [
    validators.string("inputValue", 100),
    validators.string("destinationGodown", 200),
    body("sourceLocation").optional().isString().trim(),
    body("quantity").optional().isInt({ min: 1 }),
    body("notes").optional().isString().trim(),
  ],
  validators.handleValidationErrors,
  async (req, res) => {
    try {
      const {
        inputValue,
        sourceLocation,
        destinationGodown,
        estimatedArrival,
        quantity,
        notes,
      } = req.body;

      const transitItem = new Transit({
        inputValue,
        sourceLocation: sourceLocation || "Factory",
        destinationGodown,
        estimatedArrival: estimatedArrival ? new Date(estimatedArrival) : null,
        quantity: quantity || 1,
        notes,
      });

      await transitItem.save();
      logger.info("Transit item added", { inputValue, destinationGodown });
      res.json({ message: "Item added to transit", transit: transitItem });
    } catch (error) {
      logger.error("Error adding transit item:", error);
      res.status(500).json({ message: "Error adding transit item" });
    }
  }
);

// API: Update transit status (mark as delivered/cancelled)
app.put(
  "/api/transits/:id/status",
  validators.rejectUnknownFields(["status"]),
  [body("status").isIn(["In Transit", "Delivered", "Cancelled"])],
  validators.handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const transit = await Transit.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );

      if (!transit) {
        return res.status(404).json({ message: "Transit item not found" });
      }

      logger.info("Transit status updated", { id, status });
      res.json({ message: "Transit status updated", transit });
    } catch (error) {
      logger.error("Error updating transit status:", error);
      res.status(500).json({ message: "Error updating transit status" });
    }
  }
);

// API: Get transit summary statistics
app.get("/api/transits/summary", async (req, res) => {
  try {
    const totalInTransit = await Transit.countDocuments({
      status: "In Transit",
    });
    const transitByGodown = await Transit.aggregate([
      { $match: { status: "In Transit" } },
      {
        $group: {
          _id: "$destinationGodown",
          count: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      totalInTransit,
      byGodown: transitByGodown.map((g) => ({
        godownName: g._id,
        itemCount: g.count,
        totalQuantity: g.totalQuantity,
      })),
    });
  } catch (error) {
    logger.error("Error fetching transit summary:", error);
    res.status(500).json({ message: "Error fetching transit summary" });
  }
});

app.use("/api", excelRoutes);
app.use("/api", billingRoutes);

// Serve static files from React build
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Start Server
const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
const serverUrl =
  process.env.NODE_ENV === "production"
    ? `https://${process.env.SERVER_HOST || "your-domain.com"}:${PORT}`
    : `http://localhost:${PORT}`;

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running at ${serverUrl}`, {
    port: PORT,
    host: '0.0.0.0',
    env: process.env.NODE_ENV || "development",
    https: process.env.NODE_ENV === "production",
  });
  console.log(`Server is listening on 0.0.0.0:${PORT}`);
});
