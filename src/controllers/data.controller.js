import asyncHandler from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { fetchOpenMeteo } from "../utils/openMeteo.js";
import { fetchSoilData } from "../utils/soilGrids.js";
import { fetchMarketPrices} from "../utils/marketPrices.js"

const getCropPredictionData = asyncHandler(async (req, res) => {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
        throw new ApiError(400, "Latitude and Longitude are required.");
    }

    // Validate coordinates
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    
    if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
        throw new ApiError(400, "Invalid latitude or longitude values.");
    }

    try {
        // Fetch data in parallel for better performance
        const [weatherData, soilData] = await Promise.all([
            fetchOpenMeteo(lat, lon),
            fetchSoilData(lat, lon)
        ]);

        // Process temperature data with error handling
        let temperature = null;
        try {
            if (weatherData.daily && weatherData.daily.temperature_2m_max) {
                temperature = weatherData.daily.temperature_2m_max[0];
            }
        } catch (error) {
            console.warn("Error processing temperature data:", error.message);
        }

        // Process humidity data with error handling - Calculate average from hourly data
        let humidity = null;
        try {
            if (weatherData.hourly && weatherData.hourly.relativehumidity_2m) {
                // Get first 24 hours of humidity data (daily average)
                const hourlyHumidity = weatherData.hourly.relativehumidity_2m
                    .slice(0, 24) // First 24 hours
                    .filter(hum => hum !== null && hum !== undefined);
                
                if (hourlyHumidity.length > 0) {
                    humidity = hourlyHumidity.reduce((sum, hum) => sum + hum, 0) / hourlyHumidity.length;
                }
            }
        } catch (error) {
            console.warn("Error processing humidity data:", error.message);
        }

        // Process rainfall data with error handling
        let rainfall = null;
        try {
            if (weatherData.daily && weatherData.daily.precipitation_sum) {
                rainfall = weatherData.daily.precipitation_sum[0];
            }
        } catch (error) {
            console.warn("Error processing rainfall data:", error.message);
        }

        // Process nitrogen data with enhanced error handling
        let averageNitrogen = null;
        try {
            const nitrogenLayer = soilData.properties?.layers?.find(l => l.name === "nitrogen");
            if (nitrogenLayer && nitrogenLayer.depths) {
                const nitrogenValues = nitrogenLayer.depths
                    .map(d => d.values?.mean)
                    .filter(v => v !== undefined && v !== null);
                    
                if (nitrogenValues.length > 0) {
                    averageNitrogen = nitrogenValues.reduce((acc, val) => acc + val, 0) / nitrogenValues.length;
                }
            }
        } catch (error) {
            console.warn("Error processing nitrogen data:", error.message);
        }

        // Process pH data with enhanced error handling
        let phMean = null;
        try {
            const phLayer = soilData.properties?.layers?.find(l => l.name === "phh2o");
            if (phLayer && phLayer.depths) {
                const phValues = phLayer.depths
                    .map(d => d.values?.mean)
                    .filter(v => v !== undefined && v !== null);
                    
                if (phValues.length > 0) {
                    phMean = phValues.reduce((acc, val) => acc + val, 0) / phValues.length;
                }
            }
        } catch (error) {
            console.warn("Error processing pH data:", error.message);
        }

        // Add fallback values if soil data is missing or invalid
        if (averageNitrogen === null) {
            console.warn("Using default nitrogen value");
            averageNitrogen = 1.5; // Reasonable default value for nitrogen in g/kg
        }

        if (phMean === null) {
            console.warn("Using default pH value");
            phMean = 6.5; // Reasonable default neutral pH value
        }

        // Prepare data for AI model
       const processedData = {
    N: averageNitrogen,       // nitrogen value
    temperature: temperature, // °C
    humidity: humidity,       // %
    ph: phMean,               // soil pH
    rainfall: rainfall        // mm
      };

console.log("Processed Data for AI Model:", processedData);
      
        // Check if we have all required data
        const missingData = Object.entries(processedData)
            .filter(([key, value]) => value === null || value === undefined)
            .map(([key]) => key);
            
        if (missingData.length > 0) {
            console.warn("Missing data fields:", missingData);
            throw new ApiError(500, `Missing critical data: ${missingData.join(", ")}`);
        }

        const aiModelUrl = "https://sih-crop-prediction-model-1.onrender.com/predict/crop";

        try {
            const aiResponse = await fetch(aiModelUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(processedData),
                timeout: 10000 // 10 second timeout
            });

            if (!aiResponse.ok) {
                throw new ApiError(aiResponse.status, `AI model API error: ${aiResponse.statusText}`);
            }

            const prediction = await aiResponse.json();

            return res
                .status(200)
                .json(new ApiResponse(200, { 
                    inputData: processedData, 
                    prediction 
                }, "Data sent to AI model and prediction received successfully."));

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new ApiError(504, "AI model request timeout");
            }
            throw new ApiError(500, `Failed to get prediction from AI model: ${error.message}`);
        }

    } catch (error) {
        // Handle errors from the main try block (API fetch failures)
        if (error instanceof ApiError) {
            throw error;

        }
        throw new ApiError(500, `Failed to fetch external data: ${error.message}`);
    }
});

const getSeason = () => {
    // Determine season based on current month
    const currentMonth = new Date().getMonth() + 1; // Months are 0-indexed in JS
    
    if (currentMonth >= 6 && currentMonth <= 10) { // June to October
        return "Kharif";
    } else if (currentMonth >= 11 || currentMonth <= 3) { // November to March
        return "Rabi";
    } else { // April to May
        return "Zaid";
    }
};

const getCropYieldPrediction = asyncHandler(async (req, res) => {
    // Get coordinates from URL parameters
   const { lat, lon } = req.query;

    
    // Get crop, state, fertilizer, and area from request body
    const { crop, state, fertilizer, area } = req.body;

    if (!lat || !lon || !crop || !state || !fertilizer || !area) {
        throw new ApiError(400, "Latitude, Longitude, crop, state, fertilizer, and area are required.");
    }

    // Validate coordinates
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
        throw new ApiError(400, "Invalid latitude or longitude values.");
    }
    
    // Validate fertilizer
    const fertilizerNum = parseFloat(fertilizer);
    if (isNaN(fertilizerNum) || fertilizerNum < 0) {
        throw new ApiError(400, "Invalid fertilizer value.");
    }
    
    // Validate area
    const areaNum = parseFloat(area);
    if (isNaN(areaNum) || areaNum <= 0) {
        throw new ApiError(400, "Invalid area value. Area must be a positive number.");
    }

    const season = getSeason();
    const year = new Date().getFullYear();
    
    // Fetch rainfall data from OpenMeteo
    const weatherData = await fetchOpenMeteo(latNum, lonNum);
    let annual_rainfall = 0;
    if (weatherData.daily && weatherData.daily.precipitation_sum) {
        // Sum up precipitation for the entire year
        annual_rainfall = weatherData.daily.precipitation_sum.reduce((sum, val) => sum + val, 0);
    }
    if (annual_rainfall === 0) {
      console.warn("Could not fetch valid annual rainfall data; using a default value.");
      annual_rainfall = 1200; // Using a default value as a fallback
    }

    const aiModelUrl = "https://sih-crop-prediction-model-1.onrender.com/predict/yield";
    
    const processedData = {
        crop: crop,
        crop_year: year,
        season: season,
        state: state,
        area: areaNum,
        annual_rainfall: annual_rainfall,
        fertilizer: fertilizerNum
    };
    
    try {
        const aiResponse = await fetch(aiModelUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(processedData)
        });

        if (!aiResponse.ok) {
            throw new ApiError(aiResponse.status, `AI model API error: ${aiResponse.statusText}`);
        }

        const prediction = await aiResponse.json();

        return res
            .status(200)
            .json(new ApiResponse(200, { inputData: processedData, prediction }, "Crop yield prediction received successfully."));

    } catch (error) {
        throw new ApiError(500, `Failed to get prediction from AI model: ${error.message}`);
    }
});

const getMarketData = asyncHandler(async (req, res) => {
    const { state, district, commodity } = req.body; // get inputs from the request

    if (!state || !commodity) {
        throw new ApiError(400, "State and commodity are required.");
    }

    try {
        const marketData = await fetchMarketPrices({ state, district, commodity }); // Use the function with your inputs
        
        if (!marketData || marketData.length === 0) {
            return res.status(404).json(
                new ApiResponse(404, {}, "No market data found for the given criteria.")
            );
        }

        return res.status(200).json(
            new ApiResponse(200, marketData, "Market data fetched successfully.")
        );
    } catch (error) {
        throw new ApiError(500, `Failed to fetch market data: ${error.message}`);
    }
});

export { getCropPredictionData,getCropYieldPrediction, getMarketData };