import { describe, expect, it } from "vitest";
// @ts-expect-error plain ESM script without type declarations
import { alnum, closestSentences, coverage, ecfrParagraphs, hasNumber, htmlText, numbersIn, paragraphText } from "../../scripts/verify-sources.mjs";

const xml = `<DIV8 N="52.21" TYPE="SECTION"><HEAD>§ 52.21 Prevention of significant deterioration of air quality.</HEAD>
<P>(a) <I>Plan disapproval.</I> The provisions of this section are applicable.</P>
<P>(b) <I>Definitions.</I> For the purposes of this section:</P>
<P>(1)(i) <I>Major stationary source</I> means—</P>
<P>(<I>a</I>) Any of the following stationary sources;</P>
<P>(<I>b</I>) Notwithstanding the stationary source size specified;</P>
<P>(ii) A major source that is major for volatile organic compounds.</P>
<P>(2) <I>Major modification</I> means any physical change.</P>
<P>(48) <I>Baseline actual emissions</I> means the rate of emissions, in tons per year, of a regulated NSR pollutant, as determined in accordance with paragraphs (b)(48)(i) through (iv) of this section.</P>
<P>(i) For any existing electric utility steam generating unit:</P>
<P>(<I>a</I>) The average rate shall include fugitive emissions.</P>
<P>(ii) For an existing emissions unit (other than an electric utility steam generating unit):</P>
<P>(<I>d</I>) For a regulated NSR pollutant, when a project involves multiple emissions units, only one consecutive 24-month period must be used.</P>
<P>(c) <I>Ambient air increments.</I> In areas designated as Class I.</P>
<P>(h) Eighth paragraph.</P>
<P>(1) One.</P>
<P>(2) Two.</P>
<P>(i) The letter i paragraph.</P>
</DIV8>`;

describe("source verifier", () => {
  const paras = ecfrParagraphs(xml);
  const des = (start: string) => paras.find((p: { text: string }) => p.text.startsWith(start))?.des;

  it("assigns eCFR paragraph designations", () => {
    expect(des("Plan disapproval")).toBe("(a)");
    expect(des("Major stationary source")).toBe("(b)(1)(i)");
    expect(des("Any of the following")).toBe("(b)(1)(i)(a)");
    expect(des("Notwithstanding")).toBe("(b)(1)(i)(b)");
    expect(des("A major source")).toBe("(b)(1)(ii)");
    expect(des("Major modification")).toBe("(b)(2)");
    expect(des("Baseline actual")).toBe("(b)(48)");
    expect(des("For any existing electric")).toBe("(b)(48)(i)");
    expect(des("For an existing emissions unit")).toBe("(b)(48)(ii)");
    expect(des("For a regulated NSR pollutant")).toBe("(b)(48)(ii)(d)");
    expect(des("Ambient air")).toBe("(c)");
    expect(des("The letter i")).toBe("(i)");
    expect(paragraphText(paras, "(b)(48)")).toContain("only one consecutive 24-month period");
  });

  it("matches quotes regardless of spacing and punctuation", () => {
    const text = alnum("The rule says: baseline actual emis-\nsions means the rate");
    expect(text.includes(alnum("baseline actual emissions means"))).toBe(true);
    expect(coverage("one two three four five six seven eight", alnum("one two three four five six seven nine"))).toBeCloseTo(2 / 3);
  });

  it("finds restated numbers on the page", () => {
    expect(numbersIn("100 tpy of NOx, 1,000 lb/day, or 0.5 ton")).toEqual(["100", "1000", "0.5"]);
    expect(hasNumber("emits 1,000 pounds", "1000")).toBe(true);
    expect(hasNumber("emits 100.5 tons", "100")).toBe(false);
    expect(hasNumber("PTE of 250 tpy", "25")).toBe(false);
    expect(closestSentences("major at 100 tpy", "Intro text here that is long enough. A source is major if it emits 100 tpy or more. Other text about nothing in particular here.")[0]).toContain("100 tpy");
  });

  it("reads page text without scripts", () => {
    expect(htmlText("<html><script>var x=1</script><p>Air&nbsp;permits &amp; forms</p></html>")).toBe("Air permits & forms");
  });
});
