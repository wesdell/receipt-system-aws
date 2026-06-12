export const handlerReceipts = async (event: any) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Receipt API works"
    })
  };
};
