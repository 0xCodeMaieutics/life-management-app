# Security Rules

## Never specify error message in detail

On the server side for example when returning error message for example for the status 400, don't specify the error message like "A PDF file is required", instead log the specific error and return a generic message like "Bad request".

Same thing for 500 errors. Use the generic message "Internal server error", unless you are asked otherwise.
