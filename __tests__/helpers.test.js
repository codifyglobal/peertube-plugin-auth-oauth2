const { getRandomBytes } = require('../helpers');

it('getRandomBytes ', async () => {
  // Act
  const randomString1 = await getRandomBytes(16);
  const randomString2 = await getRandomBytes(16);
  // Assert
  expect(randomString1.length).toStrictEqual(16);
  expect(randomString2.length).toStrictEqual(16);
  expect(randomString1).not.toStrictEqual(randomString2);
});
