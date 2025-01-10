const auth = async (req, res, next) => {
  const authCode = req.headers.authorization
  if (authCode === process.env.TEST_AI_TOKEN)
    next()
  else
    res.send({ status: 'Unauthorized', message: '未授权.', data: null })
}

export { auth }
