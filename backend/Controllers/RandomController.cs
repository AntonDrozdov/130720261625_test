using Microsoft.AspNetCore.Mvc;
using RandomNumberApi.Services;

namespace RandomNumberApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RandomController : ControllerBase
    {
        private readonly IRandomNumberService _randomNumberService;

        public RandomController(IRandomNumberService randomNumberService)
        {
            _randomNumberService = randomNumberService;
        }

        [HttpGet]
        public IActionResult Get()
        {
            var result = _randomNumberService.GetRandomNumber();
            return Ok(new { number = result });
        }
    }
}
