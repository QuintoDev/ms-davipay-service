module.exports = {
    success: (res, data = {}, message = 'Operación exitosa', status = 200) => {
        return res.status(status).json({
            success: true,
            data,
            message
        });
    },

    error: (res, code = 'INTERNAL_ERROR', message = 'Error interno', details = {}, status = 500) => {
        return res.status(status).json({
            success: false,
            error: {
                code,
                message,
                details
            }
        });
    }
};
