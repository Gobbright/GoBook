const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

function readEnv() {
  const envPath = path.resolve(__dirname, '../../backend/.env');
  const values = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return values;
}

test('admin navigation, storage subpages, and notifications render without route duplication', async ({ page }) => {
  const env = readEnv();
  const failures = [];
  const consoleErrors = [];
  page.on('response', (response) => {
    if (response.url().includes('/api/admin/') && response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('http://127.0.0.1:5173/admin-login');
  await page.getByLabel('Admin ID').fill(env.ADMIN_LOGIN_ID || 'admin');
  await page.locator('#adminPassword').fill(env.ADMIN_LOGIN_PASSWORD || 'admin@123');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/admin');
  await expect(page.getByRole('button', { name: 'User Management', exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'User Details', exact: true })).toHaveCount(0);

  const notificationBell = page.locator('button[title="Notifications"]');
  await expect(notificationBell).toHaveCount(1);
  await notificationBell.click();
  const viewAll = page.getByRole('button', { name: 'View All', exact: true });
  await expect(viewAll).toHaveCount(1);
  await viewAll.click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/admin/notifications');
  await expect(page.getByRole('heading', { name: 'Notifications', exact: true })).toBeVisible();

  const pages = [
    ['/admin/storage/overview', 'Storage Overview'],
    ['/admin/storage/files', 'GridFS Files'],
    ['/admin/storage/users', 'All User Storage Size'],
    ['/admin/storage/collections', 'Database Collections'],
    ['/admin/storage/daily-reports', 'Daily Reports'],
    ['/admin/payments/successful', 'Successful Payments'],
    ['/admin/subscription/plans', 'Plans'],
  ];
  for (const [route, heading] of pages) {
    await page.goto(`http://127.0.0.1:5173${route}`);
    await expect(page).toHaveURL(`http://127.0.0.1:5173${route}`);
    await expect(page.locator('header.fixed h1')).toHaveText(heading);
  }

  await page.goto('http://127.0.0.1:5173/admin/storage/users');
  for (const column of ['User / Business / Website', 'Owner email', 'Users', 'Database data', 'GridFS size', 'Total used']) {
    await expect(page.getByRole('columnheader', { name: column, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('columnheader', { name: 'DB documents', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Export Users CSV', exact: true })).toBeVisible();

  await page.goto('http://127.0.0.1:5173/admin/storage/collections');
  await expect(page.getByRole('button', { name: 'Export Summary CSV', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export All Data JSON', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export JSON', exact: true })).not.toHaveCount(0, { timeout: 15000 });

  await page.goto('http://127.0.0.1:5173/admin/payments/successful');
  await expect(page.getByRole('columnheader', { name: 'Invoice Number', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Invoice Email Status', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Actions', exact: true })).toBeVisible();
  expect(await page.locator('table button[title="Resend invoice email"]').count()).toBeGreaterThan(0);
  expect(await page.locator('table button[title="Download invoice PDF"]').count()).toBeGreaterThan(0);

  await page.goto('http://127.0.0.1:5173/admin/storage/overview');
  const storageMenu = page.getByRole('button', { name: 'Storage', exact: true });
  await expect(storageMenu).toHaveCount(1);
  for (const name of ['Overview', 'Files (GridFS)', 'All User Size', 'DB Collections', 'Daily Reports']) {
    await expect(page.getByRole('button', { name: `- ${name}`, exact: true })).toHaveCount(1);
  }
  expect(failures, `Admin API failures: ${failures.join(', ')}`).toEqual([]);
  expect(consoleErrors, `Console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
