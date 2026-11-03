using APIHandler.Entities;
using APIHandler.Repositories.Reservations;
using APIHandler.Repositories.Tables;
using APIHandler.Services.Tables;
using Moq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace APIHandler.Tests.Services;

/// <summary>Defect D11: results of parallel availability checks were added to a shared, non-thread-safe List.</summary>
public class TableServiceTests
{
    [Fact]
    public async Task GetAvailableTablesAsync_returns_every_free_table_when_checks_run_in_parallel()
    {
        var tables = Enumerable.Range(1, 500)
            .Select(n => new Table { Id = $"table-{n}", LocationId = "loc-1", Capacity = 4, TableNumber = n })
            .ToList();
        var tableRepository = new Mock<ITableRepository>();
        tableRepository.Setup(r => r.GetTablesByLocationIdAsync("loc-1")).ReturnsAsync(tables);

        // Each lookup completes on a thread-pool thread, so the availability checks really overlap.
        var reservationRepository = new Mock<IReservationRepository>();
        reservationRepository
            .Setup(r => r.GetReservationsByTableIdAsync(It.IsAny<string>()))
            .Returns(() => Task.Run(async () =>
            {
                await Task.Yield();
                return new List<Reservation>();
            }));

        var service = new TableService(tableRepository.Object, reservationRepository.Object);
        var start = DateTime.UtcNow.Date.AddDays(3).AddHours(10);

        for (var attempt = 0; attempt < 5; attempt++)
        {
            var available = (await service.GetAvailableTablesAsync("loc-1", 2, start)).ToList();
            Assert.Equal(tables.Select(t => t.Id), available.Select(t => t.Id));
        }
    }
}
