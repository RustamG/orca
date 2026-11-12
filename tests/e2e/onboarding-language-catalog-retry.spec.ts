import { test, expect } from './helpers/orca-app'

test.use({ dismissOnboarding: false, seedTestRepo: false })

test('recovers rejected language catalogs without reloading', async ({
  electronApp,
  orcaPage
}, testInfo) => {
  const language = await orcaPage.evaluate(async () => {
    const detection = await window.api.app.getSystemLanguageDetection?.([navigator.language])
    return detection?.locale === 'fr' ? 'ja' : 'fr'
  })
  const catalogPattern = new RegExp(`/${language}-[^/]+\\.(?:json|js)(?:\\?|$)`)
  await electronApp.evaluate(({ session }, selectedLanguage) => {
    const pattern = new RegExp(`/${selectedLanguage}-[^/]+\\.(?:json|js)(?:\\?|$)`)
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      callback({ cancel: pattern.test(details.url) })
    })
  }, language)
  const rejected = orcaPage.waitForEvent('requestfailed', {
    predicate: (request) => catalogPattern.test(request.url())
  })
  const timeOrigin = await orcaPage.evaluate(() => performance.timeOrigin)
  await orcaPage.evaluate(async (selectedLanguage) => {
    const store = window.__store
    if (!store) {
      throw new Error('Renderer store unavailable')
    }
    const settings = await window.api.settings.get()
    if (!settings.telemetry) {
      throw new Error('Telemetry settings unavailable')
    }
    await store.getState().updateSettingsOrThrow({
      uiLanguage: selectedLanguage === 'ja' ? 'ja' : 'fr',
      telemetry: { ...settings.telemetry, onboardingLanguageCohort: 'control' }
    })
  }, language)
  const failedRequest = await rejected
  await orcaPage.getByRole('button', { name: 'Switch language' }).click()
  await expect(orcaPage.getByRole('alert')).toContainText('Could not load this language')
  await orcaPage.screenshot({ path: testInfo.outputPath('catalog-request-rejected.png') })

  await electronApp.evaluate(({ session }) => {
    session.defaultSession.webRequest.onBeforeRequest(null)
  })
  expect(
    await orcaPage.evaluate(async (url) => (await fetch(url)).status, failedRequest.url())
  ).toBe(200)
  await orcaPage.getByRole('button', { name: 'Retry', exact: true }).click()

  await expect(
    orcaPage.getByRole('radio', { name: language === 'fr' ? 'Français' : '日本語', exact: true })
  ).toBeChecked()
  await expect(orcaPage.getByRole('alert')).toHaveCount(0)
  await expect
    .poll(() => orcaPage.evaluate(() => window.api.settings.get().then((s) => s.uiLanguage)))
    .toBe(language)
  expect(await orcaPage.evaluate(() => performance.timeOrigin)).toBe(timeOrigin)
  await orcaPage.screenshot({ path: testInfo.outputPath('catalog-retry-recovered.png') })

  const nextLanguage = language === 'fr' ? 'ja' : 'fr'
  const nextName = nextLanguage === 'ja' ? '日本語' : 'Français'
  const previousName = language === 'ja' ? '日本語' : 'Français'
  const nextPattern = new RegExp(`/${nextLanguage}-[^/]+\\.(?:json|js)(?:\\?|$)`)
  await electronApp.evaluate(({ session }, selectedLanguage) => {
    const pattern = new RegExp(`/${selectedLanguage}-[^/]+\\.(?:json|js)(?:\\?|$)`)
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      callback({ cancel: pattern.test(details.url) })
    })
  }, nextLanguage)
  const nextRejected = orcaPage.waitForEvent('requestfailed', {
    predicate: (request) => nextPattern.test(request.url())
  })
  await orcaPage.getByRole('radio', { name: nextName, exact: true }).click()
  await nextRejected
  await expect(orcaPage.getByRole('alert')).toBeVisible()
  await expect(orcaPage.getByRole('radio', { name: previousName, exact: true })).toBeChecked()
  await expect
    .poll(() => orcaPage.evaluate(() => window.api.settings.get().then((s) => s.uiLanguage)))
    .toBe(language)

  await electronApp.evaluate(({ session }) => {
    session.defaultSession.webRequest.onBeforeRequest(null)
  })
  await orcaPage.getByRole('alert').getByRole('button').click()
  await expect(orcaPage.getByRole('radio', { name: nextName, exact: true })).toBeChecked()
  await expect(
    orcaPage.getByRole('radiogroup', {
      name: nextLanguage === 'ja' ? '表示言語' : 'Langue d’affichage',
      exact: true
    })
  ).toBeVisible()
  await expect(orcaPage.getByRole('alert')).toHaveCount(0)
  await expect
    .poll(() => orcaPage.evaluate(() => window.api.settings.get().then((s) => s.uiLanguage)))
    .toBe(nextLanguage)
  expect(await orcaPage.evaluate(() => performance.timeOrigin)).toBe(timeOrigin)
})
