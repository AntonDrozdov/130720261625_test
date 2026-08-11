namespace RandomNumberApi.Services
{
    public class RandomNumberService : IRandomNumberService
    {
        private readonly Random _random = new Random();

        public int GetRandomNumber()
        {
            return _random.Next(1, 101);
        }
    }
}
