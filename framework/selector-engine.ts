// framework/selector-engine.ts
import { Page, Locator } from '@playwright/test';

export interface SelectorCandidate {
  type: 'role' | 'label' | 'css' | 'text' | 'data-testid' | 'aria-label';
  role?: string;
  name?: string;
  text?: string;
  selector?: string;
}

export interface SelectorDictionary {
  selectors: Record<string, any>;
}

export class SelectorEngine {
  private dictionary: SelectorDictionary;

  constructor(dictionary: SelectorDictionary) {
    this.dictionary = dictionary;
  }

  /**
   * セレクタ辞書からLocatorを取得する
   * @param page Playwrightのページオブジェクト
   * @param selectorPath ドット記法のセレクタパス（例: "login.username"）
   * @returns Promise<Locator>
   */
  async getLocator(page: Page, selectorPath: string): Promise<Locator> {
    const candidates = this.getSelectorCandidates(selectorPath);
    
    if (!candidates || candidates.length === 0) {
      throw new Error(`Selector not found in dictionary: ${selectorPath}`);
    }

    // 優先順位順に試行
    for (const candidate of candidates) {
      try {
        const locator = this.createLocator(page, candidate);
        
        // 要素が存在するかチェック
        if (await locator.count() > 0) {
          console.log(`✓ Found element using ${candidate.type} selector for ${selectorPath}`);
          return locator;
        }
      } catch (error) {
        console.log(`✗ Failed to find element using ${candidate.type} selector for ${selectorPath}`);
        continue;
      }
    }

    throw new Error(`No working selector found for: ${selectorPath}`);
  }

  /**
   * セレクタパスから候補一覧を取得
   */
  private getSelectorCandidates(selectorPath: string): SelectorCandidate[] {
    const parts = selectorPath.split('.');
    let current = this.dictionary.selectors;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        throw new Error(`Selector path not found: ${selectorPath}`);
      }
    }

    return Array.isArray(current) ? current : [];
  }

  /**
   * セレクタ候補からLocatorを生成
   */
  private createLocator(page: Page, candidate: SelectorCandidate): Locator {
    switch (candidate.type) {
      case 'role':
        return page.getByRole(candidate.role as any, candidate.name ? { name: candidate.name } : {});
      
      case 'label':
        return page.getByLabel(candidate.text || '');
      
      case 'text':
        return page.getByText(candidate.text || '');
      
      case 'css':
        return page.locator(candidate.selector || '');
      
      case 'data-testid':
        return page.getByTestId(candidate.selector || '');
      
      case 'aria-label':
        return page.locator(`[aria-label="${candidate.text}"]`);
      
      default:
        throw new Error(`Unsupported selector type: ${candidate.type}`);
    }
  }
}