        function getCsrfToken() {
            const name = 'csrftoken';
            let cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        }

        async function fetchWithCsrf(url, options = {}) {
            const method = options.method || 'GET';
            const headers = options.headers || {};
            
            // Add CSRF token for POST, PUT, PATCH, DELETE requests
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
                headers['X-CSRFToken'] = getCsrfToken();
            }
            
            return fetch(url, { ...options, headers });
        }

