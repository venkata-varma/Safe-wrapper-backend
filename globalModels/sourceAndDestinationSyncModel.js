

class GlobalHTTPMethods {
    // Generic GET request handler with headers
    static async handleGet(req, res) {
        try {
            const { url, params, headers } = req.query;
            if (!url) {
                return res.status(400).json({ message: "URL is required" });
            }

            const response = await axios.get(url, {
                params,
                headers: JSON.parse(headers || '{}'), // Parse headers if provided
            });

            res.status(response.status).json(response.data);
        } catch (error) {
            res.status(error.response?.status || 500).json({ error: error.message });
        }
    }  

    // Generic POST request handler with headers
    static async handlePost(integrationsServiceObject, authResponse, data) {
        try {
            const { dataPointUrl, serviceMethod } = integrationsServiceObject;
            if (!url || !data) {
                return res.status(400).json({ message: "URL and data are required" });
            }

            const response = await axios.post(url, data, {
                headers: authResponse, // Parse headers if provided
            });

            res.status(response.status).json(response.data);
        } catch (error) {
            res.status(error.response?.status || 500).json({ error: error.message });
        }
    }

    // Generic PUT request handler with headers
    static async handlePut(req, res) {
        try {
            const { url, data, headers } = req.body;
            if (!url || !data) {
                return res.status(400).json({ message: "URL and data are required" });
            }

            const response = await axios.put(url, data, {
                headers: JSON.parse(headers || '{}'), // Parse headers if provided
            });

            res.status(response.status).json(response.data);
        } catch (error) {
            res.status(error.response?.status || 500).json({ error: error.message });
        }
    }

    // Generic PATCH request handler with headers
    static async handlePatch(req, res) {
        try {
            const { url, data, headers } = req.body;
            if (!url || !data) {
                return res.status(400).json({ message: "URL and data are required" });
            }

            const response = await axios.patch(url, data, {
                headers: JSON.parse(headers || '{}'), // Parse headers if provided
            });

            res.status(response.status).json(response.data);
        } catch (error) {
            res.status(error.response?.status || 500).json({ error: error.message });
        }
    }

    // Generic DELETE request handler with headers
    static async handleDelete(req, res) {
        try {
            const { url, data, headers } = req.body;
            if (!url) {
                return res.status(400).json({ message: "URL is required" });
            }

            const response = await axios.delete(url, {
                data,
                headers: JSON.parse(headers || '{}'), // Parse headers if provided
            });

            res.status(response.status).json(response.data);
        } catch (error) {
            res.status(error.response?.status || 500).json({ error: error.message });
        }
    }

    // Generic HEAD request handler with headers
    static async handleHead(req, res) {
        try {
            const { url, headers } = req.query;
            if (!url) {
                return res.status(400).json({ message: "URL is required" });
            }

            const response = await axios.head(url, {
                headers: JSON.parse(headers || '{}'), // Parse headers if provided
            });

            res.status(response.status).send();
        } catch (error) {
            res.status(error.response?.status || 500).json({ error: error.message });
        }
    }

    // Generic OPTIONS request handler with headers
    static async handleOptions(req, res) {
        try {
            const { url, headers } = req.query;
            if (!url) {
                return res.status(400).json({ message: "URL is required" });
            }

            const response = await axios.options(url, {
                headers: JSON.parse(headers || '{}'), // Parse headers if provided
            });

            res.status(response.status).json(response.data);
        } catch (error) {
            res.status(error.response?.status || 500).json({ error: error.message });
        }
    }
}

module.exports = {
    GlobalHTTPMethods
}